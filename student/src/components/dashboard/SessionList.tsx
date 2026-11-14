import Link from "next/link";
import { EmptyNote } from "@/components/ui/Card";
import { one } from "@/lib/relations";
import { formatRange, formatTime } from "@/lib/time";
import { JoinButton, joinState, type UpcomingSession } from "@/features/classes";

type Props = {
  sessions: UpcomingSession[];
  timeZone: string;
  now: number;
  enrolled: Set<string>;
  returnTo: string;
  empty: string;
};

/** Student-only lesson list. Staff joining privileges are never exposed here. */
export default function SessionList({ sessions, timeZone, now, enrolled, returnTo, empty }: Props) {
  if (sessions.length === 0) return <EmptyNote>{empty}</EmptyNote>;
  return <ul className="flex flex-col gap-3">
    {sessions.map(s => {
      const {canJoin,waitingUntil}=joinState({
        startsAt:s.starts_at,endsAt:s.ends_at,opensMinutes:s.join_opens_minutes,now,
        isStudent:enrolled.has(s.class_id),isManager:false,
      });
      return <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <div><Link href={`/classes/${s.class_id}`} className="font-semibold text-ink underline underline-offset-4">{one(s.classes)?.name??"Class"}</Link>
        <p className="mt-1 text-sm text-ink">{s.title}</p>
        <p className="mt-1 text-xs text-slate-text">{formatRange(s.starts_at,s.ends_at,timeZone)}</p></div>
        {canJoin ? <JoinButton sessionId={s.id} classId={s.class_id} returnTo={returnTo}/> : null}
        {waitingUntil!==null?<p className="text-xs text-slate-text">Joining opens at {formatTime(new Date(waitingUntil).toISOString(),timeZone)}</p>:null}
      </li>;
    })}
  </ul>;
}
