import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader, Metric, Surface, BlankState, Pill } from "@/components/ui/StudentUI";

export const metadata: Metadata = { title: "Academic Results & Report Cards" };

export default async function ReportCardPage() {
  const { supabase, user } = await requireUser();

  const [reportCardsRes, attemptsRes] = await Promise.all([
    supabase
      .from("mm_report_cards")
      .select("id, title, term, grade_level, attendance_percentage, overall_grade, average_score, published_at")
      .eq("student_id", user.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20),
    supabase
      .from("mm_exam_attempts")
      .select("id, exam_id, started_at, submitted_at, score, mm_exams(name, total_marks)")
      .eq("student_id", user.id)
      .order("started_at", { ascending: false })
      .limit(50),
  ]);

  const reportCards = reportCardsRes.data ?? [];
  const submitted = (attemptsRes.data ?? []).filter((row) => row.submitted_at);
  const graded = submitted.filter((row) => row.score !== null);

  const avgScore =
    reportCards.length > 0 && reportCards[0].average_score
      ? `${reportCards[0].average_score}%`
      : graded.length > 0
      ? `${Math.round(graded.reduce((acc, a) => acc + Number(a.score ?? 0), 0) / graded.length)}%`
      : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LEARNING / ACADEMIC PROGRESS"
        title="My Results & Report Cards"
        subtitle="Official term evaluation summaries, report cards and recorded examination grades."
        action={{ href: "/assessments", label: "Take assessments" }}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric
          label="Official report cards"
          value={reportCards.length}
          icon="file"
          detail="Certified term reports"
        />
        <Metric
          label="Graded assessments"
          value={graded.length}
          icon="check"
          detail="Marked examination papers"
        />
        <Metric
          label="Academic standing"
          value={avgScore}
          icon="chart"
          detail="Average score / standing"
        />
        <Metric
          label="Academy status"
          value="Certified"
          icon="school"
          detail="Verified by Mentora"
        />
      </div>

      {/* OFFICIAL REPORT CARDS */}
      <Surface
        title="Certified Academic Report Cards"
        description="Official term evaluation documents published by your academy administrators"
      >
        {reportCards.length === 0 ? (
          <BlankState
            icon="file"
            title="No report cards published yet"
            description="Your academy will issue and publish official term report cards here at the end of each academic assessment period."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reportCards.map((rc) => (
              <article
                key={rc.id}
                className="flex flex-col justify-between rounded-xl border border-line bg-page p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a8664]">
                      {rc.term || "Academic Term"}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-deep font-mono text-base font-extrabold text-mint">
                      {rc.overall_grade || "A"}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-extrabold text-ink">{rc.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-text">
                    <span>
                      Average Score: <strong className="text-ink">{rc.average_score ?? 0}%</strong>
                    </span>
                    <span>
                      Attendance:{" "}
                      <strong className="text-[#0a8664]">
                        {rc.attendance_percentage !== null ? `${rc.attendance_percentage}%` : "100%"}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-[11px] text-slate-text">
                    Issued {rc.published_at ? new Date(rc.published_at).toLocaleDateString("en-LK") : "Recently"}
                  </span>
                  <Link
                    href={`/report-card/${rc.id}`}
                    className="student-action student-action-primary text-xs"
                  >
                    View & Print Report →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Surface>

      {/* CONTINUOUS ASSESSMENT ATTEMPTS */}
      <Surface
        title="Continuous Assessments & Exam Attempts"
        description="Recorded online test submissions and automatically evaluated exam scores"
      >
        {submitted.length === 0 ? (
          <BlankState
            icon="chart"
            title="No submitted exams"
            description="When you take and submit tests, your marks and grading status will appear here."
            action={{ href: "/assessments", label: "View available exams" }}
          />
        ) : (
          <div className="student-table-scroll">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Assessment Name</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((row) => {
                  const exam = Array.isArray(row.mm_exams) ? row.mm_exams[0] : row.mm_exams;
                  return (
                    <tr key={row.id}>
                      <td className="font-bold text-ink">
                        {exam?.name || `Exam ${row.exam_id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td className="text-slate-text">
                        {new Date(row.submitted_at!).toLocaleDateString("en-LK")}
                      </td>
                      <td>
                        <Pill status={row.score !== null ? "graded" : "submitted"} />
                      </td>
                      <td className="text-right font-extrabold text-ink">
                        {row.score !== null ? (
                          <span>
                            {row.score} {exam?.total_marks ? `/ ${exam.total_marks}` : ""}
                          </span>
                        ) : (
                          <span className="text-xs font-normal italic text-slate-text">Awaiting marking</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      <p className="text-xs text-slate-text">
        Official report cards are sealed and verified by your academy administration. For grade inquiries or transcript requests, contact your academy supervisor.
      </p>
    </div>
  );
}
