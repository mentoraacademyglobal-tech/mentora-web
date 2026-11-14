import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyClassIds } from "@/features/classes";
import { PageHeader, Metric, Surface, BlankState, Pill } from "@/components/ui/StudentUI";

export const metadata:Metadata={title:"Assessments & Exams"};
export default async function AssessmentsPage(){
 const {supabase,user}=await requireUser();const mine=await getMyClassIds(supabase,user.id);
 const [exams,attempts]=await Promise.all([
  supabase.from("mm_exams").select("id,name,description,course_id,starts_at,duration_minutes,total_marks,status").eq("status","published").order("starts_at",{ascending:true}).limit(100),
  supabase.from("mm_exam_attempts").select("id,exam_id,submitted_at,score,started_at").eq("student_id",user.id).order("started_at",{ascending:false}).limit(100)
 ]);
 const visible=(exams.data??[]).filter(exam=>!exam.course_id||mine.enrolled.has(exam.course_id));
 const submitted=(attempts.data??[]).filter(a=>a.submitted_at);
 return <div className="space-y-6"><PageHeader eyebrow="LEARNING / EXAMINATIONS" title="Assessments" subtitle="View published assessments, examination schedules and your recorded results."/>
 <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Published exams" value={exams.error?"—":visible.length} icon="check" detail="Available to your classes"/><Metric label="Submitted attempts" value={attempts.error?"—":submitted.length} icon="file" detail="Recorded by Mentora"/><Metric label="Results available" value={attempts.error?"—":submitted.filter(a=>a.score!==null).length} icon="chart" detail="Marked submissions"/><Metric label="Course access" value={mine.enrolled.size} icon="book" detail="Enrolled classes"/></div>
 <Surface title="Academy assessments" description="Published by your academy through the manager panel">{exams.error?<BlankState icon="check" title="Exams module is not configured" description="Assessment listings require the manager exam tables and student access policies."/>:visible.length?<div className="space-y-3">{visible.map(exam=><div className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between" key={exam.id}><div><h3 className="text-[13px] font-extrabold text-ink">{exam.name}</h3><p className="mt-1 text-xs text-slate-text">{exam.description||"Academic assessment"}</p><p className="mt-2 text-xs text-slate-text">{exam.starts_at?new Date(exam.starts_at).toLocaleString("en-LK"):"Date to be announced"}{exam.duration_minutes?` · ${exam.duration_minutes} min`:""}{exam.total_marks?` · ${exam.total_marks} marks`:""}</p></div><Link href={`/assessments/${exam.id}`} className="student-action student-action-primary self-start">Take exam</Link></div>)}</div>:<BlankState icon="check" title="No exams published yet" description="Your academy's published examinations will appear here once assigned to your enrolled classes."/>}</Surface>
 <Surface title="Your results" description="Only your recorded attempts are shown">{attempts.error?<BlankState icon="chart" title="Results unavailable" description="The student exam attempt access policy must be enabled."/>:submitted.length?<div className="student-table-scroll"><table className="student-table"><thead><tr><th>Submission</th><th>Date</th><th>Status</th><th>Score</th></tr></thead><tbody>{submitted.map(row=><tr key={row.id}><td className="font-mono text-slate-text">{row.exam_id.slice(0,8).toUpperCase()}</td><td>{new Date(row.submitted_at!).toLocaleDateString("en-LK")}</td><td><Pill status={row.score!==null?"graded":"submitted"}/></td><td className="font-extrabold">{row.score??"Pending marking"}</td></tr>)}</tbody></table></div>:<BlankState icon="chart" title="No submitted exams" description="Your assessment history will populate after completed and marked attempts."/>}</Surface>
 <p className="text-xs text-slate-text">Exams currently support automatically graded multiple-choice and true/false questions. Other question types require manual marking features.</p>
 </div>;
}
