import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader,Metric,Surface,BlankState } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
import { one } from "@/lib/relations";
import {VodLibraryList} from "@/features/vod";

export const metadata:Metadata={title:"My Digital Library"};
export default async function LibraryPage(){
 const {supabase,user}=await requireUser();
 const [{data:profile}, recordings, videos] = await Promise.all([
   supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
   supabase.from("mm_recording_entitlements").select("id,recording_id,expires_at,revoked_at,recordings(title,class_id)").eq("student_id",user.id).order("created_at",{ascending:false}).limit(100),
   supabase.from("mm_video_entitlements").select("id,video_id,expires_at,revoked_at,mm_videos(name,description)").eq("student_id",user.id).order("created_at",{ascending:false}).limit(100)
 ]);
 const studentName = profile?.full_name || user.user_metadata?.full_name || user.email || "Mentora Student";
 const now=new Date().getTime();
 const entitled=(r:{revoked_at:string|null;expires_at:string|null})=>!r.revoked_at&&(!r.expires_at||Date.parse(r.expires_at)>now);
 const ownedRecordings=(recordings.data??[]).filter(entitled);
 const ownedVideos=(videos.data??[]).filter(entitled);
 return <div className="space-y-6"><PageHeader eyebrow="LEARNING / PURCHASED MEDIA" title="My Digital Library" subtitle="Purchased recordings and on-demand videos approved for your account by Mentora Manager." action={{href:"/store",label:"Explore store"}}/>
 <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Purchased recordings" value={recordings.error?"â€”":ownedRecordings.length} icon="video" detail="Active recording entitlements"/><Metric label="On-demand videos" value={videos.error?"â€”":ownedVideos.length} icon="play" detail="Active video entitlements"/><Metric label="Total library items" value={recordings.error&&videos.error?"â€”":ownedRecordings.length+ownedVideos.length} icon="book" detail="Approved media access"/><Metric label="Purchase history" value="View" icon="cash" detail="Track every order"/></div>
 <div className="grid gap-5 xl:grid-cols-2"><Surface title="Purchased recordings" description="Approved individual recording purchases">{recordings.error?<BlankState icon="video" title="Library not available" description="Recording entitlements require the manager database extension."/>:ownedRecordings.length?<div className="space-y-2">{ownedRecordings.map(r=>{const recording=one(r.recordings as {title:string;class_id:string}|{title:string;class_id:string}[]|null);return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3" key={r.id}><div className="flex items-center gap-3"><Icon name="video" className="h-5 w-5 text-[#0a9874]"/><div><strong className="block text-xs">{recording?.title??"Recording"}</strong><small className="text-slate-text">{r.expires_at?`Access until ${new Date(r.expires_at).toLocaleDateString("en-LK")}`:"No set expiry"}</small></div></div>{recording?.class_id?<Link className="student-action student-action-secondary" href={`/classes/${recording.class_id}/recordings/${r.recording_id}`}>Watch <Icon name="arrow-right" className="h-3 w-3"/></Link>:<span className="student-chip">Media available</span>}</div>})}</div>:<BlankState icon="video" title="No purchased recordings" description="Your individually approved recording purchases will appear here."/>}</Surface>
 <Surface title="Video on demand" description="Tickets and approved video entitlements">{videos.error?<BlankState icon="play" title="VOD module not configured" description="Video ticket entitlements require the manager extension."/>:ownedVideos.length?<VodLibraryList videos={ownedVideos} studentName={studentName}/>:<BlankState icon="play" title="No on-demand videos" description="Approved video purchases will populate your library."/>}</Surface></div>
 <p className="text-xs leading-5 text-slate-text">Purchased recordings and Video on Demand use the Mentora protected video player with dynamic anti-piracy session watermarks.</p>
 </div>;
}
