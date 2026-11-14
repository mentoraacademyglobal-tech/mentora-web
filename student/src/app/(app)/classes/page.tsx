import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/relations";
import { getMyClassIds, listVisibleClasses, listUpcomingSessions } from "@/features/classes";
import { PageHeader, Metric, BlankState, Surface, formatLkr } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
import OrderButton from "@/components/commerce/OrderButton";

export const metadata: Metadata = { title: "My Classes" };

export default async function ClassesIndexPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, user } = await requireUser();
  const [all, mine] = await Promise.all([listVisibleClasses(supabase), getMyClassIds(supabase, user.id)]);
  const upcoming = await listUpcomingSessions(supabase, new Date().toISOString(), 100, [...mine.enrolled]);

  const enrolled = all.filter(cls => mine.enrolled.has(cls.id));
  const available = all.filter(cls => !mine.enrolled.has(cls.id));

  const filteredEnrolled = enrolled.filter(cls =>
    `${cls.name} ${one(cls.subjects)?.name ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
  );
  const filteredAvailable = available.filter(cls =>
    `${cls.name} ${one(cls.subjects)?.name ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  const subjects = new Set(enrolled.map(cls => one(cls.subjects)?.name).filter(Boolean));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LEARNING / ACADEMICS"
        title="My Classes"
        subtitle="All your enrolled courses, lesson links and class recordings in one place."
        action={{ href: "/schedule", label: "View timetable" }}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Enrolled classes" value={enrolled.length} detail="Active courses" icon="book" />
        <Metric label="Subjects" value={subjects.size} detail="Unique subjects" icon="school" />
        <Metric
          label="Upcoming lessons"
          value={upcoming.filter(s => mine.enrolled.has(s.class_id)).length}
          detail="Scheduled sessions"
          icon="calendar"
        />
        <Metric label="Available courses" value={available.length} detail="Academy catalog" icon="check" />
      </div>

      <div className="student-card p-4 sm:p-5">
        <form action="/classes" className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Your enrolled classes</h2>
            <p className="mt-1 text-xs text-slate-text">
              Showing {filteredEnrolled.length} of {enrolled.length} enrolled courses
            </p>
          </div>
          <div className="flex w-full max-w-sm gap-2">
            <input
              aria-label="Search classes"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by course or subject..."
              className="student-search min-w-0 flex-1"
            />
            <button type="submit" className="student-action student-action-primary">
              Search
            </button>
          </div>
        </form>
      </div>

      {filteredEnrolled.length === 0 ? (
        <div className="student-card">
          <BlankState
            icon="book"
            title={q ? "No matching enrolled classes" : "No enrolled classes yet"}
            description={
              q
                ? "Try a different course or subject search."
                : "You can browse and request enrollment in the available courses below."
            }
            action={q ? { href: "/classes", label: "Clear search" } : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredEnrolled.map(cls => (
            <article
              key={cls.id}
              className="student-card student-card-hover flex flex-col justify-between overflow-hidden p-5 sm:p-6"
            >
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="rounded-xl bg-mint/10 p-3 text-[#0ba178]">
                    <Icon name="school" className="h-5 w-5" />
                  </span>
                  <span className="student-chip">
                    {one(cls.subjects)?.syllabus_code ? `CODE ${one(cls.subjects)?.syllabus_code}` : "Enrolled"}
                  </span>
                </div>
                <h2 className="text-[17px] font-extrabold text-ink">{cls.name}</h2>
                <p className="mt-1 text-xs text-slate-text">
                  {one(cls.subjects)?.name ?? "Course"}
                  {cls.term ? ` · ${cls.term}` : ""}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Link href={`/classes/${cls.id}/recordings`} className="text-xs font-bold text-[#0b9e79] hover:underline">
                  Watch recordings →
                </Link>
                <Link className="student-action student-action-primary" href={`/classes/${cls.id}`}>
                  Open class <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <Surface
          title="Available Academy Courses"
          description={`${filteredAvailable.length} course${filteredAvailable.length === 1 ? "" : "s"} open for enrollment`}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredAvailable.map(cls => {
              const price = Math.max(0, Number(cls.rate_per_lesson ?? 0) - Number(cls.discount_amount ?? 0));
              return (
                <article
                  key={cls.id}
                  className="flex flex-col justify-between rounded-xl border border-line bg-page p-5"
                >
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="inline-flex rounded-lg bg-mist px-2.5 py-1 font-mono text-[11px] font-bold text-slate-text">
                        {one(cls.subjects)?.syllabus_code || "ACADEMY"}
                      </span>
                      <span className="text-sm font-extrabold text-ink">{formatLkr(price)}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-ink">{cls.name}</h3>
                    <p className="mt-1 text-xs text-slate-text">
                      {one(cls.subjects)?.name ?? "General Course"}
                      {cls.term ? ` · ${cls.term}` : ""}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <span className="text-xs text-slate-text">Monthly fee / per lesson</span>
                    <OrderButton
                      productId={cls.id}
                      productName={cls.name}
                      price={price}
                      category="classes"
                      label="Enroll & Pay"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </Surface>
      )}
    </div>
  );
}
