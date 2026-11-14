import {NextRequest,NextResponse} from 'next/server';
import {requireUser} from '@/lib/auth';
import {isPaymentProof} from '@/lib/upload';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  const {supabase, user} = await requireUser();
  if (!user) return NextResponse.json({error: 'Sign in required'}, {status: 401});

  const {data: membership, error: memberErr} = await supabase
    .from('memberships')
    .select('organisation_id')
    .eq('user_id', user.id)
    .eq('role', 'student')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (memberErr || !membership) return NextResponse.json({error: 'Student membership required'}, {status: 403});

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({error: 'No form data supplied'}, {status: 400});

  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({error: 'Bank transfer slip file is required'}, {status: 400});

  if (file.size < 1 || file.size > 5242880) {
    return NextResponse.json({error: 'File size must be under 5 MB'}, {status: 400});
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({error: 'Supported formats: PNG, JPG, WebP, or PDF'}, {status: 400});
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const orgId = membership.organisation_id;
  const path = `${orgId}/slips/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPaymentProof(bytes, file.type)) {
    return NextResponse.json({error: 'The receipt contents do not match its file type.'}, {status: 400});
  }

  const {data, error} = await supabase.storage
    .from('mentora-manager-media')
    .upload(path, bytes, {contentType: file.type, upsert: false});

  if (error) {
    console.error('Payment proof upload failed:', error.message);
    return NextResponse.json({error: 'Your receipt could not be uploaded. Please try again; no receipt was submitted.'}, {status: 502});
  }

  if (!data?.path) return NextResponse.json({error: 'The receipt upload was not confirmed. Please try again.'}, {status: 502});
  return NextResponse.json({path: data.path});
}
