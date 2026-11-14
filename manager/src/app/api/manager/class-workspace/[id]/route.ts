import {NextResponse} from 'next/server';
import {z} from 'zod';
import {requireManager} from '@/lib/supabase';
import {canAccess} from '@/lib/permissions';
export const dynamic='force-dynamic';
type Params={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Params){
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)return NextResponse.json({error:'Invalid class ID'},{status:400});
 const auth=await requireManager();
 if(!auth.authorized || !auth.organisationId)return NextResponse.json({error:'Manager access required'},{status:403});
 if(!canAccess(auth.role,'courses','read'))return NextResponse.json({error:'Class access required'},{status:403});
 const db=auth.supabase;const org=auth.organisationId;
 const {data:course,error}=await db.from('classes').select('id,name,term,status,announcement,rate_per_lesson,discount_amount,course_type,zoom_account,tutor_id,subject_id,created_at').eq('id',id).eq('organisation_id',org).maybeSingle();
 if(error)return NextResponse.json({error:error.message},{status:400});
 if(!course)return NextResponse.json({error:'Class not found'},{status:404});
 const [enrollments,lessons,recordings,resources]=await Promise.all([
  db.from('enrolments').select('id,student_id,class_id,status,started_on').eq('organisation_id',org).eq('class_id',id).order('started_on',{ascending:false}).limit(100),
  db.from('sessions').select('id,title,starts_at,ends_at,status').eq('organisation_id',org).eq('class_id',id).order('starts_at',{ascending:false}).limit(100),
  db.from('recordings').select('id,title,status,duration_seconds,created_at').eq('organisation_id',org).eq('class_id',id).order('created_at',{ascending:false}).limit(100),
  db.from('mm_resources').select('id,name,description,file_path,status').eq('organisation_id',org).eq('class_id',id).limit(100)
 ]);
 for(const [name,result] of Object.entries({enrollments,lessons,recordings,resources})){
  if(result.error)return NextResponse.json({error:`Unable to load ${name}: ${result.error.message}`},{status:400});
 }
 const ids=[...new Set((enrollments.data??[]).map(x=>x.student_id).filter(Boolean))];
 let studentNames:Record<string,string>={};
 if(ids.length){
   const {data:profiles,error:profileError}=await db.from('profiles').select('id,full_name').in('id',ids);
   if(profileError)return NextResponse.json({error:profileError.message},{status:400});
   studentNames=Object.fromEntries((profiles??[]).map(p=>[p.id,p.full_name||'Student']));
 }
 return NextResponse.json({course, enrollments:(enrollments.data??[]).map(e=>({...e,student_name:studentNames[e.student_id]||'Student'})), lessons:lessons.data??[],recordings:recordings.data??[],resources:resources.data??[],truncated:{enrollments:(enrollments.data??[]).length===100,lessons:(lessons.data??[]).length===100,recordings:(recordings.data??[]).length===100,resources:(resources.data??[]).length===100}});
}
