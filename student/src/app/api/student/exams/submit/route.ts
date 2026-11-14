import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const body=await request.json().catch(()=>null);
  if(!body || typeof body!=='object' || !UUID.test(String(body.attempt_id)) ||
     !body.answers || typeof body.answers!=='object' || Array.isArray(body.answers))
    return NextResponse.json({error:'Invalid submission'},{status:400});
  const answers:Record<string,string>={};
  for (const [key,value] of Object.entries(body.answers)) {
    if(!UUID.test(key)||typeof value!=='string'||value.length>300)
      return NextResponse.json({error:'Invalid answer'},{status:400});
    answers[key]=value;
  }
  const {data,error}=await supabase.rpc('mm_finish_exam',{p_attempt:body.attempt_id,p_answers:answers});
  if(error)return NextResponse.json({error:error.message},{status:403});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
