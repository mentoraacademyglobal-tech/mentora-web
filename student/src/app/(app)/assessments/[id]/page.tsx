import { requireUser } from '@/lib/auth';
import ExamRunner from '@/components/exams/ExamRunner';
import { PageHeader } from '@/components/ui/StudentUI';
export default async function TakeExamPage({params}:{params:Promise<{id:string}>}){
  await requireUser();const {id}=await params;
  return <div className="space-y-6"><PageHeader eyebrow="ASSESSMENTS / EXAM" title="Exam workspace" subtitle="Choose an answer for each question and submit before time expires."/><ExamRunner examId={id}/></div>;
}
