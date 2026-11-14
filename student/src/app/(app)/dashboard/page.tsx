import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import Banner from "@/components/ui/Banner";
import Icon from "@/components/layout/Icon";
import { Metric, Surface, BlankState } from "@/components/ui/StudentUI";
import SessionList from "@/components/dashboard/SessionList";
import { one } from "@/lib/relations";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import { getMyClassIds, listUpcomingSessions, listVisibleClasses } from "@/features/classes";
import { getProfileName, listMyMemberships, JoinForm } from "@/features/identity";
import { listRecentPublished } from "@/features/recordings";

export const metadata: Metadata = { title: "Student Dashboard" };

export default async function DashboardPage({searchParams}: {searchParams:Promise<{error?:string;notice?:string;code?:string}>}) {
  const {error,notice,code}=await searchParams;
  const {supabase,user}=await requireUser();
  const [memberships,profileName,mine]=await Promise.all([
    listMyMemberships(supabase),getProfileName(supabase,user.id),getMyClassIds(supabase,user.id)
  ]);
  const firstName=(profileName || user.email?.split("@")[0] || "there").trim().split(" ")[0];
  const studentMembership=memberships.find(m=>m.role==="student");
  if(!studentMembership)return <div className="space-y-5"><Banner error={error} notice={notice}/><div className="student-hero p-8"><p className="student-kicker !text-mint">WELCOME TO MENTORA</p><h1 className="mt-3 text-3xl font-extrabold">Hello, {firstName}.</h1><p className="mt-2 max-w-xl text-sm text-[#b5d4dc]">Your account is ready, but academy membership is not configured. Contact Mentora support.</p></div><Surface title="Join your academy"><JoinForm initialCode={(code??"").toUpperCase().slice(0,20)}/></Surface></div>;
  const now=new Date().getTime();
  const timeZone=one(studentMembership.organisations)?.timezone ?? DEFAULT_TIMEZONE;
  const [allClasses,allSessions,allRecordings,points,coins,payments]=await Promise.all([
    listVisibleClasses(supabase),listUpcomingSessions(supabase,new Date(now).toISOString(),80,[...mine.enrolled]),listRecentPublished(supabase,60,[...mine.enrolled]),
    supabase.from("mm_points_accounts").select("balance").eq("student_id",user.id).maybeSingle(),
    supabase.from("mm_coin_accounts").select("balance").eq("student_id",user.id).maybeSingle(),
    supabase.from("mm_invoices").select("id",{count:"exact",head:true}).eq("student_id",user.id).eq("status","pending")
  ]);
  const classes=allClasses.filter(c=>mine.enrolled.has(c.id));
  const upcoming=allSessions.filter(s=>mine.enrolled.has(s.class_id));
  const recordings=allRecordings.filter(r=>mine.enrolled.has(r.class_id));
  const within24=upcoming.filter(s=>Date.parse(s.starts_at)<now+86400000).length;
  const next=upcoming[0];
  return <div className="space-y-6">
    <Banner error={error} notice={notice}/>
    <section className="student-hero flex flex-col justify-between gap-6 p-7 sm:flex-row sm:items-center sm:px-8 sm:py-9">
      <div className="relative z-10"><p className="text-[10px] font-extrabold tracking-[.17em] text-mint">STUDENT DASHBOARD</p><h1 className="mt-2 text-[27px] font-extrabold tracking-tight sm:text-[34px]">Good to see you, {firstName} <span aria-hidden="true">✦</span></h1><p className="mt-2 max-w-lg text-[13px] leading-6 text-[#b2d1d7]">{within24 ? `You have ${within24} ${within24===1?"class":"classes"} in the next 24 hours.` : "Your learning space is ready. Explore your courses and stay on track."}</p><div className="mt-6 flex flex-wrap gap-2"><Link href={next?"/schedule":"/classes"} className="student-action student-action-primary">{next?"View next class":"My classes"}<Icon name="arrow-right" className="h-4 w-4" /></Link><Link href="/recordings" className="student-action border border-white/25 text-white hover:bg-white/10">Watch recordings</Link></div></div>
      <div className="relative z-10 flex min-w-[170px] items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-5"><div className="rounded-xl bg-mint/15 p-3 text-mint"><Icon name="calendar" className="h-6 w-6" /></div><div><p className="text-[11px] text-[#b2d1d7]">Coming up</p><p className="text-3xl font-extrabold">{upcoming.length}</p><p className="text-[10px] text-[#b2d1d7]">Scheduled lessons</p></div></div>
    </section>
    <section aria-label="Learning overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="My classes" value={classes.length} detail="Active enrollments" icon="book" /><Metric label="Upcoming lessons" value={upcoming.length} detail="Scheduled ahead" icon="calendar" /><Metric label="Available recordings" value={recordings.length} detail="Published class videos" icon="video" /><Metric label="Pending invoices" value={payments.error?"—":(payments.count??0)} detail={payments.error?"Finance not configured":"Awaiting verification"} icon="cash" /></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(285px,1fr)]">
      <div className="space-y-5">
        <Surface title="Have a class invitation code?" description="Registration never needs a code. Enter a class code here only if the academy gave you one."><JoinForm /></Surface>
        <Surface title="Continue learning" description="Pick up where your academy left off" link={{href:"/classes",label:"All classes"}}>
          {classes.length ? <div className="grid gap-3 sm:grid-cols-2">{classes.slice(0,4).map(cls=><Link href={`/classes/${cls.id}`} key={cls.id} className="student-card-hover block rounded-xl border border-line bg-page p-4"><span className="mb-4 inline-flex rounded-xl bg-mint/15 p-2.5 text-[#0b9e77]"><Icon name="book" className="h-5 w-5" /></span><p className="text-sm font-extrabold text-ink">{cls.name}</p><p className="mt-1 text-xs text-slate-text">{one(cls.subjects)?.name ?? "Course"}{cls.term?` · ${cls.term}`:""}</p><p className="mt-4 flex items-center gap-2 text-xs font-bold text-[#0a9874]">Open class <Icon name="arrow-right" className="h-3 w-3" /></p></Link>)}</div> : <BlankState icon="book" title="No classes yet" description="Your classes will appear as soon as Mentora Manager enrolls you."/>}
        </Surface>
        <Surface title="Upcoming live lessons" description="Class dates and joining windows" link={{href:"/schedule",label:"Full timetable"}}>
          {upcoming.length ? <SessionList sessions={upcoming.slice(0,4)} now={now} timeZone={timeZone} enrolled={mine.enrolled} returnTo="/dashboard" empty="No upcoming lessons"/> : <BlankState icon="calendar" title="You're all caught up" description="New lessons will appear here once your tutor publishes the timetable." />}
        </Surface>
      </div>
      <div className="space-y-5">
        <Surface title="Quick access" description="Everything you need, one click away">
          <div className="grid grid-cols-2 gap-2">{([
            ["Schedule","/schedule","calendar"],["Materials","/materials","file"],["Assessments","/assessments","check"],["Store","/store","cash"],["My purchases","/purchases","check"],["Rewards","/rewards","trophy"],
          ] as const).map(([label,href,icon])=><Link key={href} href={href} className="student-card-hover flex items-center gap-2 rounded-xl border border-line bg-page px-3 py-3 text-xs font-bold text-ink"><Icon name={icon} className="h-4 w-4 text-[#0d9c74]" />{label}</Link>)}</div>
        </Surface>
        <Surface title="Your rewards" description="Balances managed by your academy" link={{href:"/rewards",label:"Details"}}><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-page p-4"><p className="text-xs text-slate-text">Points</p><p className="mt-1 text-2xl font-extrabold text-ink">{points.error?"—":(points.data?.balance??0)}</p></div><div className="rounded-xl bg-page p-4"><p className="text-xs text-slate-text">Coins</p><p className="mt-1 text-2xl font-extrabold text-ink">{coins.error?"—":(coins.data?.balance??0)}</p></div></div>{(points.error||coins.error)&&<p className="mt-3 text-xs text-slate-text">Rewards appear once the manager rewards module is enabled.</p>}</Surface>
        <Surface title="Latest recordings" description="Recently published for your classes" link={{href:"/recordings",label:"View library"}}>{recordings.length?<div className="space-y-2">{recordings.slice(0,4).map(r=><Link href={`/classes/${r.class_id}/recordings/${r.id}`} key={r.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 transition hover:bg-page"><span className="rounded-lg bg-mint/10 p-2 text-[#0a9b74]"><Icon name="play" className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-xs text-ink">{r.title}</strong><small className="text-slate-text">{one(r.classes)?.name??"Recording"}</small></span><Icon name="arrow-right" className="ml-auto h-4 w-4 text-slate-text" /></Link>)}</div>:<BlankState icon="video" title="No recordings published" description="Recordings will appear here when they are published for your classes."/>}</Surface>
      </div>
    </div>
  </div>;
}
