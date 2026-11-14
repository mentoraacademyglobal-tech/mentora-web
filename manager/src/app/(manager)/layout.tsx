import { redirect } from 'next/navigation';
import { demoMode } from '@/lib/demo';
import { requireManager } from '@/lib/supabase';
import { getPermissionsForRole } from '@/lib/permissions';
import Shell from '@/components/Shell';

export default async function ManagerLayout({children}:{children:React.ReactNode}) {
  let permissions=['*'];
  let name='Administrator';
  if (!demoMode) {
    const result = await requireManager();
    if (!result.authorized) redirect('/login');
    permissions = getPermissionsForRole(result.role);
    const {data:profile}=await result.supabase.from('profiles').select('full_name').eq('id',result.user!.id).maybeSingle();
    name=profile?.full_name?.trim()||result.user?.email?.split('@')[0]||'Administrator';
  }
  return <Shell permissions={permissions} name={name}>{children}</Shell>;
}
