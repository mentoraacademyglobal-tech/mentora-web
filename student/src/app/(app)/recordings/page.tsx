import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/relations";
import { getMyClassIds, listVisibleClasses } from "@/features/classes";
import { listRecentPublished } from "@/features/recordings";
import { PageHeader, Metric, BlankState } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";

export const metadata: Metadata = { title: "Class Recordings" };

export default async function RecordingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, user } = await requireUser();

  const [mine, classes, entitlementsRes] = await Promise.all([
    getMyClassIds(supabase, user.id),
    listVisibleClasses(supabase),
    supabase
      .from("mm_recording_entitlements")
      .select("recording_id")
      .eq("student_id", user.id)
      .is("revoked_at", null),
  ]);

  const entitledRecIds = ((entitlementsRes?.data ?? []) as { recording_id: string }[]).map((e) => e.recording_id);
  const all = await listRecentPublished(supabase, 200, [...mine.enrolled], entitledRecIds);

  const mineRecordings = all.filter((r) => mine.enrolled.has(r.class_id) || entitledRecIds.includes(r.id));
  const filtered = mineRecordings.filter((r) =>
    `${r.title} ${one(r.classes)?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const classCount = new Set(mineRecordings.map((r) => r.class_id)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LEARNING / MEDIA LIBRARY"
        title="Recordings"
        subtitle="Revisit published lessons from your enrolled classes and entitled passes, with secure playback and dynamic session watermarks."
        action={{ href: "/classes", label: "My classes" }}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Available recordings" value={mineRecordings.length} detail="Published & entitled lessons" icon="video" />
        <Metric label="Classes with videos" value={classCount} detail="Across enrolled subjects" icon="book" />
        <Metric
          label="My classes"
          value={classes.filter((c) => mine.enrolled.has(c.id)).length}
          detail="Active course access"
          icon="school"
        />
        <Metric label="Playback security" value="Watermarked" detail="Moving session identity" icon="check" />
      </div>

      <div className="student-card p-4 sm:p-5">
        <form action="/recordings" className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Recording library</h2>
            <p className="mt-1 text-xs text-slate-text">{filtered.length} accessible videos</p>
          </div>
          <div className="flex w-full max-w-sm gap-2">
            <input
              className="student-search min-w-0 flex-1"
              type="search"
              name="q"
              defaultValue={q}
              aria-label="Search recordings"
              placeholder="Search video or subject..."
            />
            <button type="submit" className="student-action student-action-primary">
              Search
            </button>
          </div>
        </form>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/classes/${r.class_id}/recordings/${r.id}`}
              className="student-card student-card-hover group flex flex-col overflow-hidden"
            >
              <div className="relative flex h-36 items-center justify-center bg-[linear-gradient(120deg,#062a35,#0b5960)]">
                <span className="rounded-2xl bg-mint/15 p-4 text-mint transition group-hover:scale-105">
                  <Icon name="play" className="h-7 w-7" />
                </span>
                <span className="absolute bottom-3 left-4 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
                  CLASS REPLAY
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#0b9d75]">
                  {one(r.classes)?.name ?? "Enrolled course"}
                </p>
                <h2 className="mt-2 text-sm font-extrabold leading-6 text-ink">{r.title}</h2>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs font-bold text-[#0b9d75]">
                  <span>Watch recording</span>
                  <Icon name="arrow-right" className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="student-card">
          <BlankState
            icon="video"
            title={q ? "No matching recordings" : "No recordings available yet"}
            description={
              q
                ? "Try another search term."
                : "Your teacher's published class recordings and purchased video passes will appear here automatically."
            }
          />
        </div>
      )}
    </div>
  );
}
