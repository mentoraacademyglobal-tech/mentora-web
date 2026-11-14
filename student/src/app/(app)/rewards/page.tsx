import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader, Metric, Surface, BlankState } from "@/components/ui/StudentUI";

export const metadata:Metadata={title:"Rewards & Coins"};
export default async function RewardsPage(){
 const {supabase,user}=await requireUser();
 const [points,coins,transactions]=await Promise.all([
  supabase.from("mm_points_accounts").select("balance,updated_at").eq("student_id",user.id).maybeSingle(),
  supabase.from("mm_coin_accounts").select("balance,updated_at").eq("student_id",user.id).maybeSingle(),
  supabase.from("mm_reward_transactions").select("id,kind,delta,reason,created_at").eq("student_id",user.id).order("created_at",{ascending:false}).limit(50)
 ]);
 return <div className="space-y-6"><PageHeader eyebrow="MARKETPLACE / REWARDS" title="Rewards & Coins" subtitle="Track points and wallet coins awarded by your academy. All balances are maintained by Mentora Manager."/>
 <div className="student-hero grid gap-6 p-6 sm:grid-cols-2 sm:p-8"><div><p className="text-xs font-semibold text-[#b7d7dc]">Your points</p><p className="mt-3 text-4xl font-extrabold text-mint">{points.error?"—":(points.data?.balance??0).toLocaleString("en-LK")}</p><p className="mt-2 text-xs text-[#b7d7dc]">{points.error?"Rewards module not configured":"Academy reward points"}</p></div><div className="border-t border-white/20 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"><p className="text-xs font-semibold text-[#b7d7dc]">Mentora coins</p><p className="mt-3 text-4xl font-extrabold text-white">{coins.error?"—":(coins.data?.balance??0).toLocaleString("en-LK")}</p><p className="mt-2 text-xs text-[#b7d7dc]">{coins.error?"Wallet module not configured":"Managed coin balance"}</p></div></div>
 <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Reward points" value={points.error?"—":(points.data?.balance??0)} icon="trophy" detail="Current balance"/><Metric label="Mentora coins" value={coins.error?"—":(coins.data?.balance??0)} icon="cash" detail="Current balance"/><Metric label="Transactions" value={transactions.error?"—":(transactions.data?.length??0)} icon="chart" detail="Recent wallet activity"/><Metric label="Wallet status" value={points.error&&coins.error?"Not ready":"Connected"} icon="check" detail="Read only for students"/></div>
 <Surface title="Recent reward activity" description="Point and coin adjustments are recorded by your academy">{transactions.error?<BlankState icon="trophy" title="Activity history unavailable" description="Your reward and coin adjustment ledger will appear here."/>:!transactions.data?.length?<BlankState icon="trophy" title="No transactions yet" description="Points and coin adjustments will appear here when awarded or spent."/>:<div className="student-table-scroll"><table className="student-table"><thead><tr><th>Date</th><th>Type</th><th>Reason</th><th className="text-right">Change</th></tr></thead><tbody>{transactions.data.map(t=><tr key={t.id}><td className="whitespace-nowrap text-slate-text">{new Date(t.created_at).toLocaleDateString("en-LK")}</td><td className="font-bold capitalize">{t.kind}</td><td>{t.reason}</td><td className={`text-right font-extrabold ${t.delta>0?"text-[#0a9b75]":"text-danger"}`}>{t.delta>0?"+":""}{t.delta}</td></tr>)}</tbody></table></div>}</Surface>
 <p className="text-xs text-slate-text">Students cannot directly edit balances. Point and coin adjustment requests must be handled by authorized academy staff.</p>
 </div>;
}
