'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
type Question={id:string;prompt:string;type:string;options:string[];marks:number};
type Session={attempt_id:string;exam_name:string;duration_minutes:number|null;started_at:string;questions:Question[]};
type Result={score:number;total:number;submitted:boolean};
export default function ExamRunner({examId}:{examId:string}){
  const [session,setSession]=useState<Session|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [result,setResult]=useState<Result|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [seconds,setSeconds]=useState<number|null>(null);
  const begin=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const response=await fetch(`/api/student/exams/${examId}/begin`,{method:'POST',cache:'no-store'});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Cannot open exam');
      setSession(body as Session);setAnswers({});
    }catch(e){setError(e instanceof Error?e.message:'Cannot open exam');}
    finally{setBusy(false);}
  },[examId]);
  useEffect(()=>{
    if(!session || session.duration_minutes===null)return;
    const tick=()=>{
      const deadline=Date.parse(session.started_at)+session.duration_minutes!*60_000;
      setSeconds(Math.max(0,Math.ceil((deadline-Date.now())/1000)));
    };
    tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);
  },[session]);
  async function submit(){
    if(!session||busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/student/exams/submit',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({attempt_id:session.attempt_id,answers})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Submission failed');
      setResult(body as Result);
    }catch(e){setError(e instanceof Error?e.message:'Submission failed');}
    finally{setBusy(false);}
  }
  if(result)return <section className="student-card p-6"><h2 className="text-xl font-bold">Exam submitted</h2><p className="mt-3">Your score: <strong>{result.score} / {result.total}</strong></p><Link href="/assessments" className="student-action student-action-primary mt-4 inline-flex">Back to assessments</Link></section>;
  if(!session)return <section className="student-card p-6"><h2 className="text-xl font-bold">Ready to take this exam?</h2><p className="my-3 text-sm text-slate-text">Starting may use one attempt. The timer begins when the exam opens.</p><button className="student-action student-action-primary" onClick={()=>void begin()} disabled={busy}>{busy?'Opening…':'Start exam'}</button>{error&&<p role="alert" className="mt-3 text-red-600">{error}</p>}</section>;
  return <section className="student-card p-6"><div className="mb-5 flex flex-wrap items-center justify-between"><h2 className="text-xl font-bold">{session.exam_name}</h2>{seconds!==null&&<strong role="timer">Time remaining: {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong>}</div>
  {session.questions.length===0&&<p role="status">This exam has no questions yet. Contact your academy.</p>}
  <div className="space-y-5">{session.questions.map((q,index)=><fieldset key={q.id} className="rounded-xl border border-line p-4"><legend className="text-sm font-bold">{index+1}. {q.prompt} ({q.marks} marks)</legend><div className="mt-3 grid gap-2">{q.options.map(choice=><label key={choice} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-3 text-sm"><input type="radio" name={q.id} value={choice} checked={answers[q.id]===choice} onChange={()=>setAnswers(a=>({...a,[q.id]:choice}))}/>{choice}</label>)}</div></fieldset>)}</div>
  {error&&<p role="alert" className="mt-3 text-red-600">{error}</p>}
  <button className="student-action student-action-primary mt-6" onClick={()=>{if(confirm('Submit your answers? You cannot edit them afterwards.'))void submit();}} disabled={busy||session.questions.length===0}>{busy?'Submitting…':'Submit exam'}</button>
  </section>;
}
