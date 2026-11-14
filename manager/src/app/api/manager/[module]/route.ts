import {validateReferences} from '@/lib/references';
import {NextRequest,NextResponse} from 'next/server';
import {managerContext,parseFields} from '@/lib/api';
import {z} from 'zod';
import {parseYouTubeVideoId} from '@/lib/youtube';
import {parsePagination} from '@/lib/requestValidation';
import {validateNotice} from '@/lib/noticeRules';
export const dynamic='force-dynamic';
const directoryRole:Record<string,string[]>={
  students:['student'],
  tutors:['teacher'],
  admins:['super_admin','admin','academic_admin','finance_admin','content_manager','inventory_manager','teacher']
};
function failed(error:{message:string;code?:string}){
 return NextResponse.json({error:error.code==='42P01'?'Module storage is not provisioned. Apply the reviewed Mentora extension migration in staging first.':error.message},{status:400});
}
export async function GET(request:NextRequest,{params}:{params:Promise<{module:string}>}){
 const {module}=await params;const ctx=await managerContext(module);if(ctx.error||!ctx.module||!ctx.auth)return ctx.error!;
 const {searchParams}=request.nextUrl;
 const pagination=parsePagination(searchParams);
 if(!pagination)return NextResponse.json({error:'Page and limit must be positive integers within range'},{status:400});
 const {page,limit}=pagination;
 const search=(searchParams.get('search')||'').slice(0,100).trim();
 const status=(searchParams.get('status')||'all').trim();
 if(directoryRole[module]){
   // Search the canonical profiles first; then restrict to the requested membership role.
   let ids:string[]|undefined;
   if(search){
     const term=search.replace(/[%_,.()\\]/g,'').trim();
     if(!term)return NextResponse.json({rows:[],count:0});
     const {data:matches,error:profileError}=await ctx.auth.supabase.from('profiles').select('id')
       .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`).limit(200);
     if(profileError)return failed(profileError);
     ids=(matches??[]).map(x=>x.id);
     if(!ids.length)return NextResponse.json({rows:[],count:0});
   }
   let q=ctx.auth.supabase.from('memberships')
      .select('id,user_id,role,created_at,profiles(full_name,phone,email)',{count:'exact'})
      .eq('organisation_id',ctx.auth.organisationId!).in('role',directoryRole[module]);
   if(ids)q=q.in('user_id',ids);
   const {data,error,count}=await q.order('created_at',{ascending:false}).range((page-1)*limit,page*limit-1);
   if(error)return failed(error);
   const rows=(data??[]).map(m=>{
     const p=Array.isArray(m.profiles)?m.profiles[0]:m.profiles;
     return {id:m.user_id,user_id:m.user_id,role:m.role,created_at:m.created_at,
       full_name:p?.full_name??'',email:p?.email??'',phone:p?.phone??''};
   });
   return NextResponse.json({rows,count:count??0});
 }

 if (module === 'audit') {
   let q = ctx.auth.supabase.from('mm_audit_logs').select('*', {count: 'exact'})
     .eq('organisation_id', ctx.auth.organisationId!);
   if (search) {
     const term = search.replace(/[%_,.()\\]/g, '').trim();
     if (term) q = q.or(`action.ilike.%${term}%,entity.ilike.%${term}%`);
   }
   const {data, error, count} = await q.order('created_at', {ascending: false}).range((page-1)*limit, page*limit-1);
   if (error) return failed(error);

   const actorIds = Array.from(new Set((data ?? []).map((r: {actor_id?: string | null}) => r.actor_id).filter(Boolean))) as string[];
   const profileMap = new Map<string, {full_name: string; email: string}>();
   if (actorIds.length) {
     const {data: profiles} = await ctx.auth.supabase.from('profiles').select('id,full_name,email').in('id', actorIds);
     for (const p of profiles ?? []) profileMap.set(p.id, {full_name: p.full_name ?? '', email: p.email ?? ''});
   }

   const rows = (data ?? []).map((r: {id: string; actor_id?: string | null; action: string; entity: string; entity_id?: string | null; details?: unknown; created_at: string}) => {
     const actor = r.actor_id ? profileMap.get(r.actor_id) ?? {full_name: 'Administrator', email: 'â€”'} : {full_name: 'System / Guest', email: 'â€”'};
     const detailsSummary = r.details ? (typeof r.details === 'object' ? Object.entries(r.details as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(', ') : String(r.details)) : 'â€”';
     return {
       id: r.id,
       actor_id: r.actor_id ?? 'â€”',
       actor_name: actor.full_name,
       actor_email: actor.email,
       action: r.action,
       entity: r.entity,
       entity_id: r.entity_id ?? 'â€”',
       details: r.details,
       details_summary: detailsSummary.length > 75 ? detailsSummary.slice(0, 75) + 'â€¦' : detailsSummary,
       created_at: r.created_at,
     };
   });
   return NextResponse.json({rows, count: count ?? 0});
 }

 let q=ctx.auth.supabase.from(ctx.module.table).select(module==='courses'?'*,subjects(name)':'*',{count:'exact'});
 // Every domain table is tenant-scoped; memberships use dedicated handling.
 if(module==='roles')q=q.eq('organisation_id',ctx.auth.organisationId!);
 else if(ctx.module.table!=='subjects'&&ctx.module.table!=='syllabus_versions'&&ctx.module.table!=='syllabus_nodes')q=q.eq('organisation_id',ctx.auth.organisationId!);
 else q=q.eq('organisation_id',ctx.auth.organisationId!);
 if(search){const c=ctx.module.columns.find(c=>['name','title','label','email','invoice_no','order_no','ticket_no','action','full_name'].includes(c.key));if(c)q=q.ilike(c.key,`%${search.replace(/[%_\\]/g,'\\$&')}%`);}
 if(status!=='all'&&ctx.module.columns.some(c=>c.key==='status'))q=q.eq('status',status);
 if(module==='online')q=q.gte('last_seen_at',new Date(Date.now()-5*60*1000).toISOString());
 const sort=ctx.module.table==='syllabus_nodes'?'position':ctx.module.table==='recordings'?'created_at':ctx.module.table==='enrolments'?'started_on':ctx.module.table==='session_joins'?'joined_at':ctx.module.table==='syllabus_versions'?'label':ctx.module.columns.some(c=>c.key==='created_at')?'created_at':'id';
 const {data,error,count}=await q.order(sort,{ascending:false}).range((page-1)*limit,page*limit-1);
 if(error)return failed(error);
  const viewRows=module==='courses'?((data??[]) as unknown as Record<string,unknown>[]).map(row=>{const r=row as Record<string,unknown>&{subjects?:{name?:string}|null};return {...r,subject_name:r.subjects?.name??String.fromCharCode(8212),subjects:undefined};}):data??[];
 return NextResponse.json({rows:viewRows,count:count??0});
}
export async function POST(request:NextRequest,{params}:{params:Promise<{module:string}>}){
 const {module}=await params;const ctx=await managerContext(module, 'write');if(ctx.error||!ctx.module||!ctx.auth)return ctx.error!;
 if(ctx.module.readOnly)return NextResponse.json({error:'Read-only module'},{status:405});
 let fields:Record<string,unknown>;
 try{fields=parseFields(ctx.module,await request.json(),true);}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid fields'},{status:400});}
 const referenceError=await validateReferences(ctx.auth.supabase,ctx.auth.organisationId!,ctx.module,fields);
 if(referenceError)return NextResponse.json({error:referenceError},{status:400});
 const orgId=ctx.auth.organisationId!;
 // Validate every tenant-scoped FK before creating an academic record.
 const relationChecks: Record<string,{key:string;table:string}[]> = {
   qualifications:[{key:'board_id',table:'boards'}],
   subjects:[{key:'qualification_id',table:'qualifications'}],
   versions:[{key:'subject_id',table:'subjects'}],
   curriculum:[{key:'version_id',table:'syllabus_versions'}],
 };
 for (const check of relationChecks[module] ?? []) {
   const target = fields[check.key];
   if (!z.string().uuid().safeParse(target).success) return NextResponse.json({error:`Invalid ${check.key}`},{status:400});
   const {data:related,error:relationError}=await ctx.auth.supabase.from(check.table)
     .select('id').eq('id',String(target)).eq('organisation_id',orgId).maybeSingle();
   if (relationError || !related) return NextResponse.json({error:`${check.key} does not belong to this academy`},{status:400});
 }
 if(module==='curriculum' && fields.parent_id){
   const {data:parent}=await ctx.auth.supabase.from('syllabus_nodes').select('id,version_id')
     .eq('id',String(fields.parent_id)).eq('organisation_id',orgId).maybeSingle();
   if(!parent || parent.version_id!==fields.version_id) return NextResponse.json({error:'Parent topic must belong to the same syllabus version'},{status:400});
 }
 if(module==='messages'){
   const result=validateNotice(fields);
   if(!result.ok)return NextResponse.json({error:result.error},{status:400});
   if(fields.class_id){
     const {data:klass,error:klassError}=await ctx.auth.supabase.from('classes').select('id')
       .eq('id',String(fields.class_id)).eq('organisation_id',orgId).maybeSingle();
     if(klassError||!klass)return NextResponse.json({error:'Target class is not in your academy'},{status:400});
   }
   // SQL defaults will set draft and 'all' if these are omitted.
 }
 if(module==='exam-questions'){
   const {data:exam}=await ctx.auth.supabase.from('mm_exams').select('id').eq('id',String(fields.exam_id))
     .eq('organisation_id',orgId).maybeSingle();
   if(!exam)return NextResponse.json({error:'Exam does not belong to this academy'},{status:400});
   try {
     const answer=typeof fields.correct_answer==='string'?JSON.parse(fields.correct_answer):null;
     if(!answer||typeof answer.value!=='string'||!Array.isArray(answer.options)||answer.options.length<2
       ||answer.options.some((v:unknown)=>typeof v!=='string'||v.length>300)
       ||!answer.options.includes(answer.value))throw new Error('invalid');
     fields.correct_answer=answer;
   }catch{return NextResponse.json({error:'Answer key must be valid JSON with options and a matching value'},{status:400});}
 }
 if(module==='invites'){
   if (!['student','teacher'].includes(String(fields.role||'')))
     return NextResponse.json({error:'Choose student or teacher'},{status:400});
   if (fields.class_id){
     const {data:cls}=await ctx.auth.supabase.from('classes').select('id').eq('id',String(fields.class_id))
       .eq('organisation_id',orgId).maybeSingle();
     if (!cls) return NextResponse.json({error:'Class is not in your academy'},{status:400});
   }
   fields={...fields,code:crypto.randomUUID().replace(/-/g,'').slice(0,16).toUpperCase(),
     created_by:ctx.auth.user!.id,uses_left:fields.uses_left??1};
 }
 if (module === 'admins') {
   const email = String(fields.email || '').trim().toLowerCase();
   const role = String(fields.role || 'teacher').trim();
   const name = String(fields.full_name || '').trim();
   if (!email || !email.includes('@')) return NextResponse.json({error: 'Valid email is required'}, {status: 400});
   const {data: inviteResult, error: inviteError} = await ctx.auth.supabase.rpc('mm_invite_staff', {
     p_email: email,
     p_role: role,
     p_name: name,
     p_org: orgId,
   });
   if (inviteError) return NextResponse.json({error: inviteError.message}, {status: 400});
   return NextResponse.json({success: true, result: inviteResult}, {status: 201});
 }
 if(module==='courses'){
   const subjectName=String(fields.subject_name||'').trim();
   if(!subjectName||subjectName.length>100||!String(fields.name||'').trim())
     return NextResponse.json({error:'Enter a class name and a subject (for example, Mathematics).'},{status:400});
   // One database transaction sets up the optional academic prerequisites and class.
   // This is intentionally the ONLY create path: no partially created course or missing syllabus.
   const {data:createdId,error:createError}=await ctx.auth.supabase.rpc('mentora_create_class_simple',{
     p_org:orgId,p_name:fields.name,p_subject_name:subjectName,p_term:fields.term||null,
     p_options:{tutor_id:fields.tutor_id||null,zoom_account:fields.zoom_account||null,
       course_type:fields.course_type||null,announcement:fields.announcement||null,
       rate_per_lesson:fields.rate_per_lesson??0,discount_amount:fields.discount_amount??0,
       display_order:fields.display_order??0,status:fields.status||'active',image_path:fields.image_path||null}
   });
   if(createError)return failed(createError);
   const {data:created,error:readError}=await ctx.auth.supabase.from('classes').select('*')
     .eq('organisation_id',orgId).eq('id',createdId).single();
   if(readError)return failed(readError);
   return NextResponse.json(created,{status:201});
 }
 if(module==='enrollments'){
   if(!z.string().uuid().safeParse(fields.student_id).success||!z.string().uuid().safeParse(fields.class_id).success)return NextResponse.json({error:'Student and class must be selected'},{status:400});
   const {data:student}=await ctx.auth.supabase.from('memberships').select('id').eq('user_id',String(fields.student_id)).eq('organisation_id',orgId).eq('role','student').maybeSingle();
   const {data:cls}=await ctx.auth.supabase.from('classes').select('id').eq('id',String(fields.class_id)).eq('organisation_id',orgId).maybeSingle();
   if(!student||!cls)return NextResponse.json({error:'Student and class must belong to this academy'},{status:400});
   fields={student_id:fields.student_id,class_id:fields.class_id,status:fields.status||'active'};
 }
 if(module==='lessons'){
   if(!fields.title||!fields.class_id||!fields.starts_at||!fields.ends_at)return NextResponse.json({error:'Title, class and times are required'},{status:400});
   if(new Date(String(fields.ends_at))<=new Date(String(fields.starts_at)))return NextResponse.json({error:'End time must follow start time'},{status:400});
   const {data:cls}=await ctx.auth.supabase.from('classes').select('id').eq('id',String(fields.class_id)).eq('organisation_id',orgId).maybeSingle();
   if(!cls)return NextResponse.json({error:'Class is not in your academy'},{status:400});
 }
 let videoId:string|undefined,meetingUrl:string|undefined;
 if(module==='recordings'){
   videoId=parseYouTubeVideoId(String(fields.youtube_video_id||''))||undefined;delete fields.youtube_video_id;
   if(!fields.title||!fields.class_id||!videoId)return NextResponse.json({error:'Title, class and valid 11-character video ID are required'},{status:400});
   const {data:cls}=await ctx.auth.supabase.from('classes').select('id').eq('id',String(fields.class_id)).eq('organisation_id',orgId).maybeSingle();
   if(!cls)return NextResponse.json({error:'Class is not in your academy'},{status:400});
   fields.created_by=ctx.auth.user!.id;
 }
 if(module==='lessons'){
   meetingUrl=fields.join_url?String(fields.join_url):undefined;delete fields.join_url;
   fields.created_by=ctx.auth.user!.id;
 }
 const payload={...fields,organisation_id:orgId};
 const {data,error}=await ctx.auth.supabase.from(ctx.module.table).insert(payload).select().single();
 if(error)return failed(error);
 if(module==='recordings'&&videoId){
   const {error:srcError}=await ctx.auth.supabase.from('recording_sources').insert({recording_id:data.id,organisation_id:orgId,youtube_video_id:videoId});
   if(srcError){await ctx.auth.supabase.from('recordings').delete().eq('id',data.id);return failed(srcError);}
 }
 if(module==='lessons'&&meetingUrl){
   const {error:linkError}=await ctx.auth.supabase.from('session_meetings').insert({session_id:data.id,organisation_id:orgId,join_url:meetingUrl});
   if(linkError){await ctx.auth.supabase.from('sessions').delete().eq('id',data.id);return failed(linkError);}
 }
 return NextResponse.json(data,{status:201});
}
