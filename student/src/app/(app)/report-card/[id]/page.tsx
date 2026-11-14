import {parseSubjectMarks} from '@/lib/reportMarks';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/StudentUI';
import PrintReportButton from '@/components/report-card/PrintReportButton';

export const metadata: Metadata = { title: 'Official Report Card' };

type SubjectEntry = {
  subject: string;
  marks: number;
  max_marks?: number;
  grade?: string;
  remarks?: string;
};

export default async function ReportCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: report, error } = await supabase
    .from('mm_report_cards')
    .select('*')
    .eq('id', id)
    .eq('student_id', user.id)
    .eq('status', 'published')
    .maybeSingle();

  if (error || !report) notFound();

  const [profileRes, regRes, orgRes] = await Promise.all([
    supabase.from('profiles').select('full_name, email, phone').eq('id', user.id).maybeSingle(),
    supabase.from('student_registration_details').select('school, district, grade').eq('user_id', user.id).maybeSingle(),
    supabase.from('organisations').select('name').eq('id', report.organisation_id).maybeSingle(),
  ]);

  const profile = profileRes.data;
  const reg = regRes.data;
  const org = orgRes.data;

  let subjectMarks: SubjectEntry[] = [];
  let invalidMarks = false;
  try {subjectMarks = parseSubjectMarks(report.subject_marks);} catch {invalidMarks = true;}


  const studentName = profile?.full_name || 'Student';
  const academyName = org?.name || 'Mentora Academy';

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow="ACADEMICS / REPORT CARDS"
          title={report.title}
          subtitle={`Official progress report for ${report.term || 'Academic Term'}`}
          action={{ href: '/report-card', label: 'All report cards' }}
        />
      </div>

      <div className="flex justify-end print:hidden">
        <PrintReportButton />
      </div>

      {/* PRINTABLE REPORT CARD CONTAINER */}
      <article className="overflow-hidden rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-10 print:border-none print:p-0 print:shadow-none">
        {/* ACADEMY HEADER */}
        <header className="border-b-2 border-line pb-6 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#0a8664]">
            {academyName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {report.title}
          </h1>
          <p className="mt-1 text-xs text-slate-text">
            {report.term ? `Academic Period: ${report.term}` : 'Official Academic Performance Record'}
          </p>
        </header>

        {/* STUDENT IDENTIFICATION CARD */}
        <section className="my-6 grid grid-cols-2 gap-4 rounded-xl border border-line bg-page p-4 text-xs sm:grid-cols-4">
          <div>
            <span className="font-semibold text-slate-text">Student Name</span>
            <p className="mt-0.5 font-bold text-ink">{studentName}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-text">Student Index</span>
            <p className="mt-0.5 font-mono font-bold text-ink">{user.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-text">Grade / Level</span>
            <p className="mt-0.5 font-bold text-ink">{report.grade_level || reg?.grade || 'Secondary'}</p>
          </div>
          <div>
            <span className="font-semibold text-slate-text">Attendance Rate</span>
            <p className="mt-0.5 font-bold text-[#0a8664]">
              {report.attendance_percentage !== null ? `${report.attendance_percentage}%` : 'Not recorded'}
            </p>
          </div>
        </section>

        {/* OVERALL PERFORMANCE BANNER */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-mint/20 bg-mint/10 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#097b5c]">
              Overall Performance Standing
            </p>
            <p className="text-sm text-slate-text">
              Average Score: <strong className="text-ink">{report.average_score ?? 0}%</strong>
              {report.obtained_marks !== null && report.total_marks
                ? ` · Total: ${report.obtained_marks} / ${report.total_marks}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-text">Final Grade:</span>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#062a35] text-xl font-extrabold text-mint shadow-sm">
              {report.overall_grade || 'Not graded'}
            </span>
          </div>
        </div>

        {invalidMarks && <p role="alert" className="mb-4 text-sm text-red-700">Subject results could not be displayed. Please contact your academy to correct this report.</p>}
        {/* SUBJECT BREAKDOWN TABLE */}
        <div className="mb-6 overflow-hidden rounded-xl border border-line">
          <table className="student-table w-full">
            <thead>
              <tr className="bg-mist text-left text-xs text-slate-text">
                <th className="p-3">Subject / Module</th>
                <th className="p-3 text-center">Marks</th>
                <th className="p-3 text-center">Max Marks</th>
                <th className="p-3 text-center">Grade</th>
                <th className="p-3">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {subjectMarks.length > 0 ? (
                subjectMarks.map((entry, idx) => (
                  <tr key={`${entry.subject}-${idx}`} className="hover:bg-page/50">
                    <td className="p-3 font-bold text-ink">{entry.subject}</td>
                    <td className="p-3 text-center font-extrabold text-ink">{entry.marks}</td>
                    <td className="p-3 text-center text-slate-text">{entry.max_marks ?? 100}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block rounded-md bg-mist px-2 py-0.5 font-bold text-ink">
                        {entry.grade || (entry.marks >= 75 ? 'A' : entry.marks >= 65 ? 'B' : entry.marks >= 50 ? 'C' : 'S')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-text">{entry.remarks || 'Satisfactory progress'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-text">
                    No individual subject breakdown was attached to this report card.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* OFFICIAL REMARKS */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-page p-4 text-xs">
            <h4 className="font-bold text-ink">Tutor / Teacher Remarks</h4>
            <p className="mt-2 text-slate-text">
              {report.tutor_remarks || 'Consistent academic performance and active participation throughout the term.'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-page p-4 text-xs">
            <h4 className="font-bold text-ink">Principal / Head of Academy</h4>
            <p className="mt-2 text-slate-text">
              {report.principal_remarks || 'Approved and certified for publication. Continue the diligent efforts.'}
            </p>
          </div>
        </div>

        {/* FOOTER & DIGITAL CERTIFICATION */}
        <footer className="mt-8 border-t border-line pt-4 text-center text-[11px] text-slate-text">
          <p>
            Official digital document issued on{' '}
            {report.published_at ? new Date(report.published_at).toLocaleDateString('en-LK') : new Date().toLocaleDateString('en-LK')}.
          </p>
          <p className="mt-1 font-mono text-[10px] text-slate-text/70">
            Doc ID: {report.id} · Version {report.version} · Mentora Certified Academic Record
          </p>
        </footer>
      </article>

      <div className="print:hidden">
        <Link href="/report-card" className="text-xs font-bold text-[#0a8664] hover:underline">
          ← Back to all academic results
        </Link>
      </div>
    </div>
  );
}
