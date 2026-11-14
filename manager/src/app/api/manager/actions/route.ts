import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/supabase';
import {demoMode} from '@/lib/demo';
import {z} from 'zod';
import {canAccess} from '@/lib/permissions';
export const dynamic='force-dynamic';
const bodySchema=z.object({module:z.enum(['invoices','recording-orders','tickets','points','coins']),action:z.enum(['approve','reject','adjust']),id:z.uuid(),details:z.string().max(1000).optional()});
export async function POST(request:Request){
 if(demoMode)return NextResponse.json({error:'Demo actions happen locally'},{status:409});
 const auth=await requireManager();if(!auth.authorized)return NextResponse.json({error:'Forbidden'},{status:403});
 const parsed=bodySchema.safeParse(await request.json().catch(() => null));if(!parsed.success)return NextResponse.json({error:'Invalid action payload'},{status:400});
 const {module,action,id,details}=parsed.data;
 if(!canAccess(auth.role,module,'write'))return NextResponse.json({error:'Forbidden'},{status:403});
 if(module==='points'||module==='coins'){
  if(action!=='adjust')return NextResponse.json({error:'Invalid adjustment'},{status:400});
  const [amountStr,...reasonParts]=(details||'').split('|');const amount=Number(amountStr);const reason=reasonParts.join('|').trim();
  if(!Number.isSafeInteger(amount)||amount===0||!reason)return NextResponse.json({error:'Integer amount and adjustment reason are required'},{status:400});
  const {data,error}=await auth.supabase.rpc('mm_adjust_reward',{p_kind:module,p_account_id:id,p_delta:amount,p_reason:reason});
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({result:data});
 }
 if(!['approve','reject'].includes(action))return NextResponse.json({error:'Invalid action'},{status:400});
 if(action==='reject'&&!details?.trim())return NextResponse.json({error:'Rejection reason required'},{status:400});
 const {data,error}=await auth.supabase.rpc('mm_review_purchase',{p_module:module,p_record_id:id,p_decision:action,p_reason:details||''});
 return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({result:data});
}
