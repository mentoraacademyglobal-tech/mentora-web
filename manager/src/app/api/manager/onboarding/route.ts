import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { managerContext } from '@/lib/api';

export const dynamic = 'force-dynamic';
const uuid = z.string().uuid();
const createSchema = z.object({
  action: z.literal('create'),
  role: z.enum(['student', 'teacher']).default('student'),
  class_id: uuid.nullable().optional(),
  uses_left: z.number().int().min(1).max(50).default(1),
  expires_in_days: z.number().int().min(1).max(30).default(7),
});
const revokeSchema = z.object({ action: z.literal('revoke'), id: uuid });
const inputSchema = z.discriminatedUnion('action', [createSchema, revokeSchema]);

async function authorised() {
  // Reuse the same canonical membership-based manager authorization as all other pages.
  const ctx = await managerContext('invites');
  if (ctx.error || !ctx.auth || !ctx.auth.organisationId)
    return { error: ctx.error ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 }), auth: null };
  return { error: null, auth: ctx.auth };
}

export async function GET() {
  const ctx = await authorised();
  if (!ctx.auth) return ctx.error!;
  const sb = ctx.auth.supabase;
  const org = ctx.auth.organisationId!;
  const [invites, classes] = await Promise.all([
    sb.from('invite_codes').select('id,code,role,class_id,uses_left,expires_at,created_at')
      .eq('organisation_id', org).order('created_at', { ascending: false }).limit(100),
    sb.from('classes').select('id,name,term').eq('organisation_id', org).order('name').limit(300),
  ]);
  if (invites.error || classes.error) return NextResponse.json({ error: invites.error?.message ?? classes.error?.message }, { status: 400 });
  return NextResponse.json({ invites: invites.data ?? [], classes: classes.data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const ctx = await authorised();
  if (!ctx.auth) return ctx.error!;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid invitation request', details: parsed.error.flatten() }, { status: 400 });
  const sb = ctx.auth.supabase;
  const org = ctx.auth.organisationId!;
  const body = parsed.data;
  if (body.action === 'revoke') {
    // Revoke by setting remaining uses to zero. A redeemed membership is not undone.
    const { data, error } = await sb.from('invite_codes').update({ uses_left: 0 })
      .eq('id', body.id).eq('organisation_id', org).select('id,uses_left').maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    return NextResponse.json({ invitation: data });
  }
  const classId = body.class_id ?? null;
  if (classId) {
    const { data: klass, error } = await sb.from('classes').select('id')
      .eq('organisation_id', org).eq('id', classId).maybeSingle();
    if (error || !klass) return NextResponse.json({ error: 'Select a valid class belonging to Mentora' }, { status: 400 });
  }
  const code = `${randomBytes(5).toString('hex').toUpperCase()}-${randomBytes(5).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + body.expires_in_days * 86_400_000).toISOString();
  const { data, error } = await sb.from('invite_codes').insert({
    organisation_id: org, created_by: ctx.auth.user!.id, code,
    role: body.role, class_id: classId, uses_left: body.uses_left, expires_at: expiresAt,
  }).select('id,code,role,class_id,uses_left,expires_at,created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ invitation: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
