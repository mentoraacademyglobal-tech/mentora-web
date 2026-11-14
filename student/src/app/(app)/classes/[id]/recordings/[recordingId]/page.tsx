import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProfileName } from "@/features/identity";
import { RecordingPlayer,getRecording,listChapters,tagsOf } from "@/features/recordings";
import { DEFAULT_TIMEZONE,formatDay } from "@/lib/time";
import { one } from "@/lib/relations";
import { PageHeader,Surface } from "@/components/ui/StudentUI";

export default async function WatchPage({params}:{params:Promise<{id:string;recordingId:string}>}){
 const {id,recordingId}=await params;const {supabase,user}=await requireUser();
 const recording=await getRecording(supabase,id,recordingId);
 if(!recording||recording.status!=="published")notFound();
 const [chapters,profileName]=await Promise.all([listChapters(supabase,recordingId),getProfileName(supabase,user.id)]);
 const cls=one(recording.classes);const org=one((cls?.organisations??null) as {timezone:string}|{timezone:string}[]|null);
 const timeZone=org?.timezone??DEFAULT_TIMEZONE;
 return <div className="space-y-6"><div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-text"><Link href="/recordings">Recordings</Link><span>/</span><Link href={`/classes/${id}/recordings`}>{cls?.name??"Class"}</Link><span>/</span><span className="max-w-[240px] truncate text-ink">{recording.title}</span></div>
 <PageHeader eyebrow="LEARNING / WATCH" title={recording.title} subtitle={`Published ${formatDay(recording.created_at,timeZone)} · ${cls?.name??"Class recording"}`} action={{href:`/classes/${id}/recordings`,label:"Back to library"}}/>
 <div className="overflow-hidden rounded-[18px] border border-line bg-black shadow-lg"><RecordingPlayer recordingId={recording.id} title={recording.title} chapters={chapters} durationHint={recording.duration_seconds} watermark={`${profileName?.trim()||"Student"} • ${cls?.term?.trim()||cls?.name||"Mentora batch"} • ${user.id.slice(0,8)}`}/></div>
 {(recording.description||tagsOf(recording).length>0)&&<Surface title="About this lesson">{recording.description&&<p className="whitespace-pre-wrap text-[13px] leading-6 text-slate-text">{recording.description}</p>}{tagsOf(recording).length>0&&<div className="mt-4 flex flex-wrap gap-2">{tagsOf(recording).map((tag,i)=><span className="student-chip" key={`${tag.code}-${i}`}>{tag.code?`${tag.code} · `:""}{tag.title}</span>)}</div>}</Surface>}
 <p className="text-xs text-slate-text">This lesson is assigned to your account and displays a moving personalised watermark. Recording or redistribution is not permitted. Browser playback cannot block all screenshots or external screen-recording tools.</p>
 <p className="text-xs text-slate-text">Playback access is verified by the server and Supabase policies. If a recording is unavailable, check your enrollment or purchase entitlement.</p></div>;
}
