import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {managerContext} from '@/lib/api';

export const dynamic = 'force-dynamic';

const uuid = z.string().uuid();

const updateProfileSchema = z.object({
  action: z.literal('update_profile'),
  full_name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32).nullable(),
});

const updateRegistrationSchema = z.object({
  action: z.literal('update_registration'),
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  date_of_birth: z.string().trim().max(30).optional().nullable(),
  gender: z.string().trim().max(30).optional().nullable(),
  district: z.string().trim().max(80).optional().nullable(),
  grade: z.string().trim().max(40).optional().nullable(),
  medium: z.string().trim().max(40).optional().nullable(),
  school: z.string().trim().max(150).optional().nullable(),
  guardian_phone: z.string().trim().max(32).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

const enrollSchema = z.object({
  action: z.literal('enroll'),
  class_id: uuid,
});

const setStatusSchema = z.object({
  action: z.literal('set_status'),
  enrolment_id: uuid,
  status: z.enum(['active','paused','left']),
});

const setAccountStatusSchema = z.object({
  action: z.literal('set_account_status'),
  status: z.enum(['active','suspended','archived']),
  reason: z.string().trim().max(300).optional(),
});

const adjustRewardSchema = z.object({
  action: z.literal('adjust_reward'),
  kind: z.enum(['points', 'coins']),
  delta: z.number().int().refine(n => n !== 0, 'Adjustment delta cannot be 0'),
  reason: z.string().trim().min(3).max(300),
});

const studentActionSchema = z.discriminatedUnion('action', [
  updateProfileSchema,
  updateRegistrationSchema,
  enrollSchema,
  setStatusSchema,
  setAccountStatusSchema,
  adjustRewardSchema,
]);

async function context(id: string, action: 'read' | 'write' = 'read') {
  const ctx = await managerContext('students', action);
  if (ctx.error || !ctx.auth) return {error: ctx.error ?? NextResponse.json({error: 'Forbidden'}, {status: 403}), auth: null};
  if (!uuid.safeParse(id).success) return {error: NextResponse.json({error: 'Invalid student ID'}, {status: 400}), auth: null};

  const {data: member, error} = await ctx.auth.supabase
    .from('memberships')
    .select('id, user_id, role, status, created_at')
    .eq('organisation_id', ctx.auth.organisationId!)
    .eq('user_id', id)
    .eq('role', 'student')
    .maybeSingle();

  if (error) return {error: NextResponse.json({error: error.message}, {status: 400}), auth: null};
  if (!member) return {error: NextResponse.json({error: 'Student not found in your academy'}, {status: 404}), auth: null};

  return {error: null, auth: ctx.auth, member};
}

export async function GET(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const ctx = await context(id);
  if (ctx.error || !ctx.auth) return ctx.error!;

  const sb = ctx.auth.supabase;
  const org = ctx.auth.organisationId!;

  // 1. Fetch core student identity & enrollment data
  const [profileRes, enrolRes, classRes, regRes] = await Promise.all([
    sb.from('profiles').select('id, full_name, email, phone, created_at').eq('id', id).maybeSingle(),
    sb.from('enrolments').select('id, class_id, status, started_on, ended_on').eq('student_id', id).eq('organisation_id', org).order('started_on', {ascending: false}),
    sb.from('classes').select('id, name, term').eq('organisation_id', org).order('name').limit(500),
    sb.from('student_registration_details')
      .select('first_name, last_name, date_of_birth, gender, district, grade, medium, school, guardian_phone, address, referral, created_at')
      .eq('organisation_id', org)
      .eq('user_id', id)
      .maybeSingle(),
  ]);

  for (const [section, result] of Object.entries({profile:profileRes,enrolments:enrolRes,classes:classRes,registration:regRes})) {
    if(result.error)return NextResponse.json({error:`Unable to load ${section}: ${result.error.message}`},{status:400});
  }

  const classes = classRes.data ?? [];
  const classNameMap = new Map(classes.map(c => [c.id, c.name]));

  // 2. Safely query extended tables (rewards, invoices, activity, exams, report cards) without crashing if empty/optional
  const [invoicesRes, pointsRes, coinsRes, txRes, activityRes, examsRes, reportCardsRes] = await Promise.all([
    sb.from('mm_invoices')
      .select('id, invoice_no, course_id, amount, payment_method, payment_proof_path, status, rejection_reason, created_at')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .order('created_at', {ascending: false})
      .limit(50),
    sb.from('mm_points_accounts')
      .select('balance, updated_at')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .maybeSingle(),
    sb.from('mm_coin_accounts')
      .select('balance, updated_at')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .maybeSingle(),
    sb.from('mm_reward_transactions')
      .select('id, kind, delta, before_balance, after_balance, reason, created_at')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .order('created_at', {ascending: false})
      .limit(50),
    sb.from('mm_student_activity')
      .select('id, action, resource_type, resource_id, created_at')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .order('created_at', {ascending: false})
      .limit(50),
    sb.from('mm_exam_attempts')
      .select('id, exam_id, score, started_at, submitted_at, mm_exams(name, total_marks)')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .order('started_at', {ascending: false})
      .limit(50),
    sb.from('mm_report_cards')
      .select('id, title, term, grade_level, attendance_percentage, overall_grade, average_score, status, published_at, created_at')
      .eq('student_id', id)
      .eq('organisation_id', org)
      .order('created_at', {ascending: false})
      .limit(20),
  ]);

  for (const [section,result] of Object.entries({invoices:invoicesRes,points:pointsRes,coins:coinsRes,rewards:txRes,activity:activityRes,exams:examsRes,reports:reportCardsRes})) {
    if(result.error)return NextResponse.json({error:`Unable to load ${section}: ${result.error.message}`},{status:400});
  }

  // Enrich invoices with class names
  const invoices = (invoicesRes.data ?? []).map(inv => ({
    ...inv,
    course_name: inv.course_id ? classNameMap.get(inv.course_id) ?? 'Course' : 'General Academy',
  }));

  // Format exam attempts
  const examAttempts = (examsRes.data ?? []).map(attempt => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exam = Array.isArray(attempt.mm_exams) ? attempt.mm_exams[0] : (attempt.mm_exams as any);
    return {
      id: attempt.id,
      exam_id: attempt.exam_id,
      exam_name: exam?.name ?? 'Assessment',
      total_marks: exam?.total_marks ?? null,
      score: attempt.score,
      started_at: attempt.started_at,
      submitted_at: attempt.submitted_at,
    };
  });

  return NextResponse.json({
    profile: profileRes.data,
    membership: ctx.member,
    registration: regRes.data ?? null,
    enrolments: (enrolRes.data ?? []).map(e => ({
      ...e,
      class_name: classNameMap.get(e.class_id) ?? 'Class record',
    })),
    classes,
    invoices,
    points: pointsRes.data ?? {balance: 0},
    coins: coinsRes.data ?? {balance: 0},
    reward_transactions: txRes.data ?? [],
    activity: activityRes.data ?? [],
    exam_attempts: examAttempts,
    report_cards: reportCardsRes.data ?? [],
  });
}

export async function POST(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const ctx = await context(id, 'write');
  if (ctx.error || !ctx.auth) return ctx.error!;

  const json = await request.json().catch(() => null);
  const parsed = studentActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({error: 'Invalid student-management request', issues: parsed.error.issues}, {status: 400});
  }

  const body = parsed.data;
  const sb = ctx.auth.supabase;
  const org = ctx.auth.organisationId!;

  // 1. Update Profile (Name & Phone)
  if (body.action === 'update_profile') {
    const {data, error} = await sb.rpc('mm_update_student_profile', {
      p_student: id,
      p_name: body.full_name,
      p_phone: body.phone,
      p_update_name: true,
      p_update_phone: true,
      p_org: org,
    });
    if (error) return NextResponse.json({error: error.message}, {status: 403});
    return NextResponse.json({profile: data, message: 'Student name and phone updated.'});
  }

  // 2. Update Registration Details
  if (body.action === 'update_registration') {
    const updates: Record<string, unknown> = {
      user_id: id,
      organisation_id: org,
      updated_at: new Date().toISOString(),
    };
    if (body.first_name !== undefined) updates.first_name = body.first_name;
    if (body.last_name !== undefined) updates.last_name = body.last_name;
    if (body.date_of_birth !== undefined) updates.date_of_birth = body.date_of_birth;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.district !== undefined) updates.district = body.district;
    if (body.grade !== undefined) updates.grade = body.grade;
    if (body.medium !== undefined) updates.medium = body.medium;
    if (body.school !== undefined) updates.school = body.school;
    if (body.guardian_phone !== undefined) updates.guardian_phone = body.guardian_phone;
    if (body.address !== undefined) updates.address = body.address;

    const {data, error} = await sb
      .from('student_registration_details')
      .upsert(updates, {onConflict: 'organisation_id,user_id'})
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({error: error.message}, {status: 400});
    }

    // Also sync full_name in profiles if first_name and last_name are provided
    if (body.first_name !== undefined || body.last_name !== undefined) {
      const combinedName = `${data?.first_name ?? ''} ${data?.last_name ?? ''}`.trim();
      if (combinedName.length >= 2) {
        const {error: syncError} = await sb.rpc('mm_update_student_profile', {
          p_student: id,
          p_name: combinedName,
          p_phone: null,
          p_update_name: true,
          p_update_phone: false,
          p_org: org,
        });
        if(syncError)return NextResponse.json({error:'Registration was saved, but profile name synchronization failed. Retry saving to synchronize the name.'},{status:400});
      }
    }

    return NextResponse.json({registration: data, message: 'Registration details updated successfully.'});
  }

  // 3. Enroll in class
  if (body.action === 'enroll') {
    const {data: klass, error: classErr} = await sb
      .from('classes')
      .select('id')
      .eq('id', body.class_id)
      .eq('organisation_id', org)
      .maybeSingle();

    if (classErr || !klass) return NextResponse.json({error: 'Choose a class in your academy'}, {status: 400});

    const {data: existing, error: existingErr} = await sb
      .from('enrolments')
      .select('id, status')
      .eq('organisation_id', org)
      .eq('student_id', id)
      .eq('class_id', body.class_id)
      .maybeSingle();

    if (existingErr) return NextResponse.json({error: existingErr.message}, {status: 400});
    if (existing?.status === 'active') return NextResponse.json({message: 'Student is already enrolled.'});

    const result = existing
      ? await sb.from('enrolments').update({status: 'active', ended_on: null}).eq('id', existing.id).eq('organisation_id', org).eq('student_id', id).select('id').single()
      : await sb.from('enrolments').insert({organisation_id: org, student_id: id, class_id: body.class_id, status: 'active'}).select('id').single();

    return result.error
      ? NextResponse.json({error: result.error.message}, {status: 400})
      : NextResponse.json({enrolment: result.data, message: 'Student enrolled successfully.'}, {status: existing ? 200 : 201});
  }

  // 4. Set enrolment status (pause, reactivate, leave)
  if (body.action === 'set_status') {
    const {data: existing, error: lookupError} = await sb
      .from('enrolments')
      .select('id, class_id, status')
      .eq('id', body.enrolment_id)
      .eq('student_id', id)
      .eq('organisation_id', org)
      .maybeSingle();

    if (lookupError || !existing) return NextResponse.json({error: 'Enrolment not found'}, {status: 404});
    if (existing.status === body.status) return NextResponse.json({message: 'No change needed.'});

    const {data, error} = await sb
      .from('enrolments')
      .update({status: body.status, ended_on: body.status === 'left' ? new Date().toISOString().slice(0, 10) : null})
      .eq('id', existing.id)
      .eq('organisation_id', org)
      .eq('student_id', id)
      .select('id, status')
      .single();

    return error ? NextResponse.json({error: error.message}, {status: 400}) : NextResponse.json({enrolment: data, message: `Enrolment set to ${body.status}.`});
  }

  // 5. Account status change (active, suspended, archived)
  if (body.action === 'set_account_status') {
    const {data, error} = await sb.rpc('mm_set_student_status', {
      p_student: id, p_org: org, p_status: body.status, p_reason: body.reason || '',
    });
    if (error) return NextResponse.json({error: error.message}, {status: error.code === '42501' ? 403 : 400});
    return NextResponse.json({...data, message: `Student account set to ${body.status}.`});
  }

  // 6. Adjust reward points or coins
  if (body.action === 'adjust_reward') {
    const table = body.kind === 'points' ? 'mm_points_accounts' : 'mm_coin_accounts';

    let { data: account } = await sb
      .from(table)
      .select('id, balance')
      .eq('organisation_id', org)
      .eq('student_id', id)
      .maybeSingle();

    if (!account) {
      const { data: created, error: createErr } = await sb
        .from(table)
        .insert({ organisation_id: org, student_id: id, balance: 0 })
        .select('id, balance')
        .single();
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });
      account = created;
    }

    const { data: result, error: rpcErr } = await sb.rpc('mm_adjust_reward', {
      p_kind: body.kind,
      p_account_id: account.id,
      p_delta: body.delta,
      p_reason: body.reason,
    });

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 400 });
    }

    return NextResponse.json({
      message: `${body.kind === 'points' ? 'Points' : 'Coins'} adjusted by ${body.delta > 0 ? `+${body.delta}` : body.delta}.`,
      result,
    });
  }

  return NextResponse.json({error: 'Unrecognized action'}, {status: 400});
}
