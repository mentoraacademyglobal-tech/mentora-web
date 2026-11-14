import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import Banner from "@/components/ui/Banner";
import { PageHeader, Metric, Surface, BlankState } from "@/components/ui/StudentUI";
import { one } from "@/lib/relations";
import { DEFAULT_TIMEZONE,formatDay } from "@/lib/time";
import { getMyClassIds,listUpcomingSessions } from "@/features/classes";
import { listMyMemberships } from "@/features/identity";
import SessionList from "@/components/dashboard/SessionList";

export const metadata:Metadata={title:"My Timetable"};
export default async function SchedulePage({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}){
 const {error,notice}=await searchParams;
 const {supabase,user}=await requireUser();const now=new Date().getTime();
 const [memberships,mine]=await Promise.all([listMyMemberships(supabase),getMyClassIds(supabase,user.id)]);
 const allSessions=await listUpcomingSessions(supabase,new Date(now).toISOString(),150,[...mine.enrolled]);
 const timeZone=one(memberships.find(m=>m.role==="student")?.organisations??null)?.timezone??DEFAULT_TIMEZONE;
 const sessions=allSessions.filter(s=>mine.enrolled.has(s.class_id));
 const days=new Map<string,typeof sessions>();for(const s of sessions){const day=formatDay(s.starts_at,timeZone);days.set(day,[...(days.get(day)??[]),s]);}
 const next7=sessions.filter(s=>Date.parse(s.starts_at)<now+7*86400000).length;
 return <div className="space-y-6"><PageHeader eyebrow="LEARNING / TIMETABLE" title="My Schedule" subtitle={`Upcoming live sessions for your enrolled classes. All times shown in ${timeZone.replaceAll("_"," ")}.`} action={{href:"/classes",label:"My classes"}}/><Banner error={error} notice={notice}/>
 <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Upcoming lessons" value={sessions.length} detail="Scheduled ahead" icon="calendar"/><Metric label="This week" value={next7} detail="Next seven days" icon="clock"/><Metric label="Your classes" value={mine.enrolled.size} detail="Enrolled courses" icon="book"/><Metric label="Timezone" value={timeZone.split("/").at(-1)?.replaceAll("_"," ")??timeZone} detail="Times localized for you" icon="globe"/></div>
 {days.size?<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="space-y-5">{[...days.entries()].map(([day,list])=><Surface key={day} title={day} description={`${list.length} ${list.length===1?"lesson":"lessons"}`}><SessionList sessions={list} timeZone={timeZone} now={now} enrolled={mine.enrolled} returnTo="/schedule" empty="No lessons" /></Surface>)}</div><div className="space-y-5"><Surface title="How joining works"><p className="text-xs leading-6 text-slate-text">Your teacher schedules classes in Mentora Manager. Once the joining window opens, your lesson will display an active join button.</p></Surface><Surface title="Need help?"><p className="text-xs leading-6 text-slate-text">If a session is missing, check your enrollment or contact your academy through announcements.</p></Surface></div></div>:<div className="student-card"><BlankState icon="calendar" title="Nothing on your timetable yet" description="Your upcoming lessons will automatically appear after they are scheduled by the academy." action={{href:"/classes",label:"View my classes"}}/></div>}
 </div>;
}
