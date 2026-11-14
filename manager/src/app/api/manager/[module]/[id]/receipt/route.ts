import { NextResponse } from 'next/server';
import { z } from 'zod';
import { managerContext } from '@/lib/api';

export async function GET(_request: Request, {params}: {params: Promise<{module:string; id:string}>}) {
  const {module, id} = await params;
  if (!['invoices','tute-orders','merchandise-orders','recording-orders','tickets'].includes(module) || !z.uuid().safeParse(id).success)
    return NextResponse.json({error:'Unknown receipt'}, {status:404});
  const ctx = await managerContext(module);
  if (ctx.error || !ctx.auth || !ctx.module) return ctx.error!;
  const {supabase, organisationId} = ctx.auth;
  const {data:order} = await supabase.from(ctx.module.table).select('student_id,payment_proof_path')
    .eq('organisation_id',organisationId!).eq('id',id).maybeSingle();
  const path = order?.payment_proof_path;
  if (typeof path !== 'string' || !path.startsWith(`${organisationId}/slips/${order?.student_id}/`))
    return NextResponse.json({error:'Receipt unavailable'}, {status:404});
  const {data, error} = await supabase.storage.from('mentora-manager-media').createSignedUrl(path,60);
  if (error || !data?.signedUrl) return NextResponse.json({error:'Cannot open this receipt'}, {status:403});
  return new NextResponse(null,{status:302,headers:{Location:data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
