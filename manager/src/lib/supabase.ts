import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items) {
        try { items.forEach(({name,value,options}) => cookieStore.set(name,value,options)); }
        catch { /* Read-only Server Component; proxy refreshes cookies. */ }
      }
    }
  });
}

export const STAFF_ROLES = [
  'super_admin',
  'admin',
  'academic_admin',
  'finance_admin',
  'content_manager',
  'inventory_manager',
  'teacher',
] as const;

/** Same source of truth as the student LMS: public.memberships, not mm_admin_memberships. */
export async function requireManager() {
  const supabase = await supabaseServer();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if (authError || !user) return {supabase,user:null,authorized:false,organisationId:null,role:null};
  const {data,error}=await supabase.from('memberships')
    .select('organisation_id, role')
    .eq('user_id',user.id)
    .eq('status','active')
    .in('role',STAFF_ROLES as unknown as string[])
    .order('created_at').limit(100);
  if(error) console.error('Manager role verification failed:',error.code,error.message);
  const membership = data?.sort((a,b) => STAFF_ROLES.indexOf(a.role) - STAFF_ROLES.indexOf(b.role))[0];
  return {
    supabase,
    user,
    authorized:!error && Boolean(membership?.organisation_id),
    organisationId:membership?.organisation_id??null,
    role:(membership?.role as string)??null,
  };
}
