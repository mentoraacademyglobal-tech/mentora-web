import {validateReferences} from '@/lib/references';
import {NextRequest,NextResponse} from 'next/server';
import {managerContext,parseFields} from '@/lib/api';
import {z} from 'zod';
import {parseYouTubeVideoId} from '@/lib/youtube';
import {validateNotice} from '@/lib/noticeRules';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, {params}: {params: Promise<{module: string, id: string}>}) {
  const {module, id} = await params;
  const ctx = await managerContext(module, 'write');
  if (ctx.error || !ctx.module || !ctx.auth) return ctx.error!;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({error: 'Invalid ID'}, {status: 400});

  let rawJson: Record<string, unknown>;
  try {
    const parsed = z.record(z.string(), z.unknown()).safeParse(await request.json());
    if (!parsed.success) throw new Error('Invalid body');
    rawJson = parsed.data;
  } catch {
    return NextResponse.json({error: 'Request body must be a JSON object'}, {status: 400});
  }
  const isApprovalModule = Boolean(ctx.module.approval) || ['tute-orders', 'merchandise-orders'].includes(module);

  if (isApprovalModule) {
    if (rawJson.dispatch_status !== undefined || rawJson.tracking_number !== undefined) {
      const payload = z.object({dispatch_status: z.enum(['processing','dispatched','delivered','cancelled']), tracking_number: z.string().trim().max(200).nullable().optional()}).safeParse(rawJson);
      if (!payload.success || !['tute-orders','merchandise-orders'].includes(module)) return NextResponse.json({error: 'Invalid dispatch request'}, {status: 400});
      const {data, error} = await ctx.auth.supabase.rpc('mm_fulfill_order', {
        p_order_type: module, p_order_id: id, p_dispatch_status: payload.data.dispatch_status,
        p_tracking_number: payload.data.tracking_number ?? null,
      });
      return error ? NextResponse.json({error: error.message}, {status: error.code === '42501' ? 403 : 400}) : NextResponse.json({success: true, result: data});
    }
    const payload = z.object({status: z.enum(['approved','rejected','refunded','cancelled']), reason: z.string().trim().max(1000).optional(), rejection_reason: z.string().trim().max(1000).optional()}).safeParse(rawJson);
    if (!payload.success) return NextResponse.json({error: 'Invalid review request'}, {status: 400});
    const decisions = {approved: 'approve', rejected: 'reject', refunded: 'refund', cancelled: 'cancel'};
    const {data, error} = await ctx.auth.supabase.rpc('mm_review_purchase', {
      p_module: module, p_record_id: id, p_decision: decisions[payload.data.status],
      p_reason: payload.data.reason || payload.data.rejection_reason || '',
    });
    return error ? NextResponse.json({error: error.message}, {status: error.code === '42501' ? 403 : 400}) : NextResponse.json({success: true, result: data});
  }

  // 2. Read-only check for non-approval modules
  if (ctx.module.readOnly && module !== 'students') {
    return NextResponse.json({error: 'Read only module'}, {status: 405});
  }

  try {
    const fields = parseFields(ctx.module, rawJson);

    const referenceError=await validateReferences(ctx.auth.supabase,ctx.auth.organisationId!,ctx.module,fields);
    if(referenceError)return NextResponse.json({error:referenceError},{status:400});

    if (module === 'students') {
      if (!Object.keys(fields).length) return NextResponse.json({error: 'No changes supplied'}, {status: 400});
      if (fields.full_name !== undefined && (typeof fields.full_name !== 'string' || !fields.full_name.trim() || fields.full_name.length > 120)) {
        return NextResponse.json({error: 'Enter a valid full name'}, {status: 400});
      }
      if (fields.phone !== undefined && fields.phone !== null && (typeof fields.phone !== 'string' || fields.phone.length > 32)) {
        return NextResponse.json({error: 'Invalid telephone number'}, {status: 400});
      }
      const {data, error} = await ctx.auth.supabase.rpc('mm_update_student_profile', {
        p_student: id,
        p_name: fields.full_name ?? null,
        p_phone: fields.phone ?? null,
        p_update_name: fields.full_name !== undefined,
        p_update_phone: fields.phone !== undefined,
        p_org: ctx.auth.organisationId!,
      });
      return error ? NextResponse.json({error: error.message}, {status: 403}) : NextResponse.json(data);
    }

    if (module === 'admins') {
      const role = fields.role ? String(fields.role).trim() : undefined;
      if (!role) return NextResponse.json({error: 'Staff role is required'}, {status: 400});
      const {data: roleResult, error: roleError} = await ctx.auth.supabase.rpc('mm_update_staff_role', {
        p_user_id: id,
        p_role: role,
        p_org: ctx.auth.organisationId!,
      });
      if (roleError) return NextResponse.json({error: roleError.message}, {status: 400});
      return NextResponse.json({success: true, result: roleResult});
    }

    if (module === 'messages') {
      const {data: current, error: currentError} = await ctx.auth.supabase.from('mm_announcements')
        .select('publish_at,expires_at').eq('id', id).eq('organisation_id', ctx.auth.organisationId!).maybeSingle();
      if (currentError) return NextResponse.json({error: currentError.message}, {status: 400});
      if (!current) return NextResponse.json({error: 'Announcement not found'}, {status: 404});
      const result = validateNotice({...current, ...fields});
      if (!result.ok) return NextResponse.json({error: result.error}, {status: 400});
      if (fields.class_id) {
        const {data: klass, error: klassError} = await ctx.auth.supabase
          .from('classes')
          .select('id')
          .eq('id', String(fields.class_id))
          .eq('organisation_id', ctx.auth.organisationId!)
          .maybeSingle();
        if (klassError || !klass) return NextResponse.json({error: 'Target class is not in your academy'}, {status: 400});
      }
    }

    if (module === 'courses') {
      // subject_name is a form/display field, not a column on classes.
      if (fields.subject_name !== undefined) {
        const subjectName = String(fields.subject_name).trim();
        const {data: current, error: classError} = await ctx.auth.supabase.from('classes')
          .select('subject_id,subjects(name)').eq('id', id).eq('organisation_id', ctx.auth.organisationId!).maybeSingle();
        if (classError) return NextResponse.json({error: classError.message}, {status: 400});
        if (!current) return NextResponse.json({error: 'Class not found'}, {status: 404});
        const currentSubject = Array.isArray(current.subjects) ? current.subjects[0] : current.subjects;
        if (currentSubject?.name !== subjectName) {
          const {data: subjects, error: subjectError} = await ctx.auth.supabase.from('subjects')
            .select('id').eq('name', subjectName).eq('organisation_id', ctx.auth.organisationId!).limit(2);
          if (subjectError) return NextResponse.json({error: subjectError.message}, {status: 400});
          if (subjects?.length !== 1) return NextResponse.json({error: 'Choose an existing, uniquely named subject before changing this class.'}, {status: 400});
          fields.subject_id = subjects[0].id;
        }
        delete fields.subject_name;
      }

      if (fields.tutor_id) {
        const {data: tutor} = await ctx.auth.supabase
          .from('memberships')
          .select('user_id')
          .eq('organisation_id', ctx.auth.organisationId!)
          .eq('user_id', String(fields.tutor_id))
          .eq('role', 'teacher')
          .maybeSingle();
        if (!tutor) return NextResponse.json({error: 'Selected tutor does not belong to your academy'}, {status: 400});
      }
      if (fields.subject_id) {
        const {data: subject} = await ctx.auth.supabase
          .from('subjects')
          .select('id')
          .eq('id', String(fields.subject_id))
          .eq('organisation_id', ctx.auth.organisationId!)
          .maybeSingle();
        if (!subject) return NextResponse.json({error: 'Subject not in academy'}, {status: 400});

        const {data: version} = await ctx.auth.supabase
          .from('syllabus_versions')
          .select('id')
          .eq('subject_id', String(fields.subject_id))
          .eq('organisation_id', ctx.auth.organisationId!)
          .limit(1)
          .maybeSingle();
        if (!version) return NextResponse.json({error: 'No syllabus version for this subject'}, {status: 400});
        fields.syllabus_version_id = version.id;
      }
    }

    let newVideoId: string | null = null;
    if (module === 'recordings') {
      if (typeof fields.youtube_video_id === 'string' && fields.youtube_video_id.trim()) {
        newVideoId = parseYouTubeVideoId(fields.youtube_video_id);
        if (!newVideoId) return NextResponse.json({error: 'Enter a valid YouTube link or video ID'}, {status: 400});
      }
      delete fields.youtube_video_id;
      delete fields.class_id;
    }

    if (module === 'exam-questions' && fields.correct_answer !== undefined) {
      try {
        const answer = JSON.parse(String(fields.correct_answer));
        if (
          typeof answer.value !== 'string' ||
          !Array.isArray(answer.options) ||
          answer.options.length < 2 ||
          !answer.options.includes(answer.value)
        ) {
          throw new Error('invalid');
        }
        fields.correct_answer = answer;
      } catch {
        return NextResponse.json({error: 'Answer key JSON requires options and a matching value'}, {status: 400});
      }
    }

    let newMeetingUrl: string | null = null;
    if (module === 'lessons') {
      if (typeof fields.join_url === 'string' && fields.join_url.trim()) newMeetingUrl = fields.join_url;
      delete fields.join_url;
      delete fields.class_id;
      const {data: current, error: currentError} = await ctx.auth.supabase.from('sessions')
        .select('starts_at,ends_at').eq('id', id).eq('organisation_id', ctx.auth.organisationId!).maybeSingle();
      if (currentError) return NextResponse.json({error: currentError.message}, {status: 400});
      if (!current) return NextResponse.json({error: 'Lesson not found'}, {status: 404});
      const merged = {...current, ...fields};
      if (new Date(String(merged.ends_at)) <= new Date(String(merged.starts_at))) {
        return NextResponse.json({error: 'Lesson end must follow lesson start'}, {status: 400});
      }
    }

    if (module === 'enrollments') {
      delete fields.student_id;
      delete fields.class_id;
    }

    const {data: existing, error: lookupError} = await ctx.auth.supabase
      .from(ctx.module.table)
      .select('id')
      .eq('id', id)
      .eq('organisation_id', ctx.auth.organisationId!)
      .maybeSingle();

    if (lookupError || !existing) return NextResponse.json({error: 'Record not found in your academy'}, {status: 404});

    if (module === 'recordings' && newVideoId) {
      const {error: sourceError} = await ctx.auth.supabase
        .from('recording_sources')
        .upsert(
          {recording_id: id, organisation_id: ctx.auth.organisationId!, youtube_video_id: newVideoId},
          {onConflict: 'recording_id'}
        );
      if (sourceError) return NextResponse.json({error: sourceError.message}, {status: 400});
    }

    if (module === 'lessons' && newMeetingUrl) {
      const {error: meetingError} = await ctx.auth.supabase.rpc('mm_set_meeting_link', {
        p_session: id,
        p_url: newMeetingUrl,
      });
      if (meetingError) return NextResponse.json({error: meetingError.message}, {status: 400});
    }

    if (!Object.keys(fields).length) {
      return newVideoId || newMeetingUrl ? NextResponse.json({id, updated: true}) : NextResponse.json({error: 'No changes supplied'}, {status: 400});
    }

    const {data, error} = await ctx.auth.supabase
      .from(ctx.module.table)
      .update(fields)
      .eq('id', id)
      .eq('organisation_id', ctx.auth.organisationId!)
      .select()
      .single();

    if (error) return NextResponse.json({error: error.message}, {status: 400});
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({error: e instanceof Error ? e.message : 'Invalid input'}, {status: 400});
  }
}
