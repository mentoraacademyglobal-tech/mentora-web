import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';

export async function POST(request: Request) {
  const { supabase } = await requireUser();
  const input = z.object({ item: z.uuid(), code: z.string().trim().max(40) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Check the coupon code.' }, { status: 400 });
  const { data, error } = await supabase.rpc('mm_quote_tute', { p_item: input.data.item, p_code: input.data.code });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ amount: Number(data) }, { headers: { 'Cache-Control': 'no-store' } });
}
