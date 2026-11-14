import {NextResponse} from 'next/server';
import {requireUser} from '@/lib/auth';

export async function GET() {
  const {supabase, user} = await requireUser();
  const {data: membership, error: membershipError} = await supabase.from('memberships')
    .select('organisation_id').eq('user_id', user.id).eq('role', 'student').eq('status', 'active')
    .order('created_at').limit(1).maybeSingle();
  if (membershipError || !membership) return NextResponse.json({error: 'Active academy membership is required.'}, {status: 403});
  const {data: settings, error} = await supabase.from('mm_academy_settings')
    .select('academy_name,bank_name,bank_branch,bank_account_no,bank_account_name,bank_instructions,bank_details_verified')
    .eq('organisation_id', membership.organisation_id).maybeSingle();
  if (error || !settings?.bank_details_verified || !settings.bank_account_no || settings.bank_account_no === '8001234567') {
    return NextResponse.json({error: 'Bank transfers are not available yet. Contact the academy or choose cash payment.'}, {status: 503});
  }
  return NextResponse.json(settings, {headers: {'Cache-Control': 'no-store'}});
}
