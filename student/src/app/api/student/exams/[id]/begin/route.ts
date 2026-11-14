import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!UUID.test(id))return NextResponse.json({error:'Invalid exam'},{status:400});
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const {data,error}=await supabase.rpc('mm_begin_exam',{p_exam:id});
  if(error)return NextResponse.json({error:error.message},{status:403});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
}
