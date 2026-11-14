import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireManager} from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const text = z.string().trim().max(500).nullable().optional();
const settingsSchema = z.object({
  academy_name: z.string().trim().min(1).max(150).optional(), legal_name: text, tagline: text,
  phone: text, email: text, website: text, address: text,
  currency_code: z.string().min(1).max(10).optional(), currency_symbol: z.string().min(1).max(10).optional(),
  timezone: z.string().min(1).max(100).optional(), bank_name: z.string().max(150).optional(), bank_branch: z.string().max(150).optional(),
  bank_account_no: z.string().max(100).optional(), bank_account_name: z.string().max(200).optional(), bank_instructions: text,
  bank_details_verified: z.boolean().optional(), watermark_enabled: z.boolean().optional(),
  watermark_interval_seconds: z.number().int().min(5).max(120).optional(), support_phone: text,
});

export async function GET() {
  const auth = await requireManager();
  if (!auth.authorized || !['admin','super_admin'].includes(auth.role || '')) return NextResponse.json({error: 'Administrator access required'}, {status: 403});
  const {data, error} = await auth.supabase.rpc('mm_get_or_create_settings', {p_org: auth.organisationId});
  if (error) return NextResponse.json({error: error.message}, {status: 400});
  return NextResponse.json({settings: data}, {headers: {'Cache-Control': 'no-store'}});
}

export async function PATCH(request: NextRequest) {
  const auth = await requireManager();
  if (!auth.authorized || !['admin','super_admin'].includes(auth.role || '')) return NextResponse.json({error: 'Administrator access required'}, {status: 403});
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: 'Invalid academy settings'}, {status: 400});
  const {data, error} = await auth.supabase.rpc('mm_update_academy_settings', {p_org: auth.organisationId, p_settings: parsed.data});
  if (error) return NextResponse.json({error: error.message}, {status: 400});
  return NextResponse.json({success: true, settings: data});
}
