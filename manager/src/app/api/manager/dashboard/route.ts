import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/supabase';
import {demoMode} from '@/lib/demo';
export const dynamic='force-dynamic';
export async function GET(){
 if(demoMode)return NextResponse.json({error:'Preview only'},{status:409});
 const auth=await requireManager();if(!auth.authorized)return NextResponse.json({error:'Unauthorized'},{status:403});
 try {
 const orgId=auth.organisationId!;const s=auth.supabase;
 const count=async(table:string,role?:string)=>{let q=s.from(table).select('*',{count:'exact',head:true}).eq('organisation_id',orgId);if(role)q=q.eq('role',role);const {count,error}=await q;if(error)throw new Error(`Unable to load ${table}`);return count??0;};
 const [students,tutors,courses,lessons,recordings,invoices,products,pending]=await Promise.all([
   count('memberships','student'),count('memberships','teacher'),count('classes'),count('sessions'),count('recordings'),count('mm_invoices'),count('mm_products'),
   s.from('mm_invoices').select('id',{count:'exact',head:true}).eq('organisation_id',orgId).eq('status','pending')
 ]);
 // All-time verified revenue is computed in the database, never summed from one limited page.
 const {data:revenue,error:revenueError}=await s.rpc('mm_revenue_total');
 if(revenueError)throw new Error('Unable to load revenue for this account');
 if(pending.error)throw new Error('Unable to load pending invoices');
 const approvedRevenue=Number(revenue||0);
 const {data:nextLessons,error:lessonsError}=await s.from('sessions').select('id,title,starts_at,ends_at,status').eq('organisation_id',orgId).eq('status','scheduled').gte('ends_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(5);
 if(lessonsError)throw new Error('Unable to load upcoming lessons');
 return NextResponse.json({students,tutors,courses,lessons,invoices,pendingInvoices:pending.count??0,approvedRevenue,recordings,products,pendingOrders:0,monthlyRevenue:[],recent:[],upcoming:nextLessons??[]});
 } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:'Unable to load dashboard'},{status:503});}
}
