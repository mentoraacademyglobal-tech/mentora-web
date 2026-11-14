import { one } from "@/lib/relations";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PageHeader, Metric, Surface, BlankState } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
export const metadata:Metadata={title:"Academy Announcements"};
export default async function MessagesPage(){
 const {supabase,user}=await requireUser();const {data:member}=await supabase.from("memberships").select("organisation_id").eq("user_id",user.id).eq("role","student").limit(1).maybeSingle();
 const {data,error}=member?await supabase.from("mm_announcements").select("id,name,description,audience,created_at,classes(name)").eq("organisation_id",member.organisation_id).eq("status","published").in("audience",["all","students"]).order("created_at",{ascending:false}).limit(80):{data:[],error:null};
 const announcements=data??[];
 return <div className="space-y-6"><PageHeader eyebrow="COMMUNITY / UPDATES" title="Announcements" subtitle="Important academy updates, notices and communications from your Mentora management team."/>
 <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Published updates" value={error?"—":announcements.length} icon="mail" detail="Available announcements"/><Metric label="Academy" value="Mentora" icon="school" detail="Official notices"/><Metric label="Delivery" value="In portal" icon="bell" detail="View announcements here"/><Metric label="Access" value="Student" icon="users" detail="Your academy membership"/></div>
 <Surface title="Latest announcements" description="News and notices published by academy staff">{error?<BlankState icon="mail" title="Announcements not configured" description="The manager announcements module and student read policy are needed."/>:announcements.length?<div className="space-y-3">{announcements.map((a)=>{const clsName=one(a.classes)?.name;return <article key={a.id} className="flex gap-3 rounded-xl border border-line p-4"><span className="self-start rounded-xl bg-mint/10 p-2.5 text-[#0a9c78]"><Icon name="bell" className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-extrabold text-ink">{a.name}</h2><span className="student-chip capitalize">{a.audience}</span>{clsName&&<span className="rounded bg-[#062a35] px-2 py-0.5 text-[10px] font-bold text-mint">Class: {clsName}</span>}</div><p className="mt-1 text-xs text-slate-text">{new Date(a.created_at).toLocaleDateString("en-LK")}</p>{a.description&&<p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-ink">{a.description}</p>}</div></article>})}</div>:<BlankState icon="mail" title="No announcements yet" description="Updates published by the academy will appear here as soon as they're available."/>}</Surface>
 <p className="text-xs text-slate-text">Only notices published for your academy, role, and enrolled classes are shown.</p></div>;
}
