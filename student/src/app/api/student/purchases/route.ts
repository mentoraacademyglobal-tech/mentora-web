import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';
import {requireUser} from '@/lib/auth';

const common = {
  request_id: z.uuid(),
  payment_method: z.enum(['bank_deposit', 'cash']).default('bank_deposit'),
  payment_proof_path: z.string().max(1000).nullable().optional(),
};
const purchaseSchema = z.discriminatedUnion('type', [
  z.object({...common, type: z.literal('class'), class_id: z.uuid()}),
  z.object({...common, type: z.literal('recording'), recording_id: z.uuid()}),
  z.object({...common, type: z.literal('video'), video_id: z.uuid()}),
  z.object({...common, type: z.literal('tute'), tute_id: z.uuid(), delivery_method: z.literal('courier'),
    recipient_name: z.string().trim().min(1).max(100), phone: z.string().trim().regex(/^[+0-9() -]{7,30}$/),
    shipping_address: z.string().trim().min(1).max(500), coupon_code: z.string().trim().max(40).optional(),
    expected_amount: z.number().nonnegative()}),
  z.object({...common, type: z.literal('merchandise'), product_id: z.uuid(), quantity: z.number().int().min(1).max(20).default(1), shipping_address: z.string().trim().min(1).max(500)}),
]);

export async function POST(request: NextRequest) {
  const {supabase} = await requireUser();
  const parsed = purchaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({error: 'Check the order details and delivery address.'}, {status: 400});
  const p = parsed.data;
  if (p.type === 'tute') {
    const {data, error} = await supabase.rpc('mm_order_printed_tute', {
      p_item: p.tute_id, p_contact: p.recipient_name, p_phone: p.phone, p_address: p.shipping_address,
      p_code: p.coupon_code || null, p_expected: p.expected_amount, p_method: p.payment_method,
      p_proof: p.payment_proof_path || null, p_request_id: p.request_id,
    });
    return error ? NextResponse.json({error: error.message}, {status: 400}) : NextResponse.json(data, {status: 201});
  }
  const item = p.type === 'class' ? p.class_id : p.type === 'recording' ? p.recording_id : p.type === 'video' ? p.video_id : p.product_id;
  // Price, academy, order items and audit are handled atomically in PostgreSQL.
  const {data, error} = await supabase.rpc('mm_create_purchase', {
    p_type: p.type, p_item: item, p_quantity: p.type === 'merchandise' ? p.quantity : 1,
    p_method: p.payment_method, p_proof: p.payment_proof_path || null,
    p_delivery: null,
    p_shipping: 'shipping_address' in p ? p.shipping_address || null : null,
    p_request_id: p.request_id,
  });
  if (error) return NextResponse.json({error: error.message}, {status: error.code === '42501' ? 403 : 400});
  return NextResponse.json(data, {status: 201, headers: {'Cache-Control': 'no-store'}});
}
