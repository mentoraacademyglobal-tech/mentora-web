import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// A heartbeat is evidence of recent activity, not proof the user is staring at this tab.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'Sign in required'},{status:401});
  const { data:member,error:membershipError } = await supabase.from('memberships')
    .select('organisation_id').eq('user_id',user.id).eq('role','student').limit(1).maybeSingle();
  if (membershipError || !member) return NextResponse.json({error:'Student access required'},{status:403});
  const raw = await request.json().catch(()=>({}));
  const path = typeof raw.path==='string' && raw.path.startsWith('/') ? raw.path.slice(0,180) : '/dashboard';
  const { error } = await supabase.from('mm_student_presence').upsert({
    student_id:user.id,organisation_id:member.organisation_id,current_page:path,last_seen_at:new Date().toISOString(),
  },{onConflict:'student_id'});
  if(error) return NextResponse.json({error:'Presence service unavailable'},{status:503});
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
