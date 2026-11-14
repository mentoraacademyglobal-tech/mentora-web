'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Plus, RefreshCw, UserPlus } from 'lucide-react';
type Invite = { id:string;code:string;role:'student'|'teacher';class_id:string|null;uses_left:number;expires_at:string|null;created_at:string };
type Klass = {id:string;name:string;term:string|null};
type Result = {invites:Invite[];classes:Klass[]};
export default function OnboardingWorkspace() {
 const [data,setData]=useState<Result>({invites:[],classes:[]});
 const [role,setRole]=useState<'student'|'teacher'>('student');
 const [classId,setClassId]=useState('');const [uses,setUses]=useState(1);const [days,setDays]=useState(7);
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');const [message,setMessage]=useState('');
 const [newCode,setNewCode]=useState('');
 const load=useCallback(async()=>{
  try {const r=await fetch('/api/manager/onboarding',{cache:'no-store'});const j=await r.json();
   if(!r.ok)throw new Error(j.error||'Unable to load invitations');setData(j);
  } catch(e){setError(e instanceof Error?e.message:'Unable to load invitations');}finally{setLoading(false);}
 },[]);
 useEffect(()=>{// The loader only updates state after awaiting the network response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();},[load]);
 const names=useMemo(()=>new Map(data.classes.map(c=>[c.id,c.name])),[data.classes]);
 async function mutate(payload:Record<string,unknown>){
  setBusy(true);setError('');setMessage('');try {
   const r=await fetch('/api/manager/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const j=await r.json();if(!r.ok)throw new Error(j.error||'Action failed');
   if(payload.action==='create'){setNewCode(j.invitation.code);setMessage('Invitation created. Share the code privately with the intended person.');}
   else setMessage('Invitation revoked. Previously registered students remain unchanged.');
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Request failed');}finally{setBusy(false);}
 }
 async function copy(s:string){try{await navigator.clipboard.writeText(s);setMessage('Copied to clipboard.');}catch{setError('Clipboard unavailable. Select and copy the code manually.');}}
 const state=(x:Invite)=>x.uses_left===0?'Used / revoked':x.expires_at && Date.parse(x.expires_at)<new Date().getTime()?'Expired':'Ready';
 return <section className="page-content onboarding-workspace">
  <div className="page-heading"><div><p className="eyebrow">MENTORA / STUDENTS</p><h1>Invite students & tutors</h1><p className="subhead">Create registration invitations in a few clicks. No database IDs or manual account setup required.</p></div><Link className="btn btn-outline" href="/students">All students →</Link></div>
  {error&&<p className="error module-notice" role="alert">{error}</p>}
  {message&&<p className="success module-notice" role="status">{message}</p>}
  <div className="form-section"><div className="form-section-title"><h3><UserPlus size={18}/> Add a student</h3><p>Generate a code. The person registers through Mentora&apos;s Student Portal and enters this code to join the academy. You can optionally enroll them in a class automatically.</p></div>
   <form onSubmit={e=>{e.preventDefault();void mutate({action:'create',role,class_id:classId||null,uses_left:uses,expires_in_days:days});}}>
    <div className="form-fields-grid">
     <div className="form-field"><label htmlFor="on-role">Account type</label><select id="on-role" value={role} onChange={e=>setRole(e.target.value as 'student'|'teacher')}><option value="student">Student</option><option value="teacher">Tutor (teaching access only)</option></select></div>
     <div className="form-field"><label htmlFor="on-class">Class to assign (optional)</label><select id="on-class" value={classId} onChange={e=>setClassId(e.target.value)}><option value="">No class — assign later</option>{data.classes.map(c=><option value={c.id} key={c.id}>{c.name}{c.term?` · ${c.term}`:''}</option>)}</select></div>
     <div className="form-field"><label htmlFor="on-uses">Number of registrations</label><input id="on-uses" type="number" min={1} max={50} required value={uses} onChange={e=>setUses(Number(e.target.value))}/><small>Use 1 for a single student. Each redemption consumes one use.</small></div>
     <div className="form-field"><label htmlFor="on-days">Expires after</label><select id="on-days" value={days} onChange={e=>setDays(Number(e.target.value))}>{[1,3,7,14,30].map(n=><option key={n} value={n}>{n} day{n===1?'':'s'}</option>)}</select></div>
    </div><div style={{marginTop:18}}><button className="btn btn-primary" type="submit" disabled={busy}><Plus size={16}/> {busy?'Working…':'Generate invitation'}</button></div>
   </form>
   {newCode&&<div className="on-code"><strong>New invitation code</strong><code>{newCode}</code><button className="btn btn-outline btn-small" onClick={()=>void copy(newCode)}><Copy size={14}/> Copy code</button><p>Ask the student to open their Student Portal registration page, create an account, and redeem this code. A code is not a password. Do not publish it publicly.</p></div>}
  </div>
  <div className="form-section"><div className="form-section-title"><h3>Recent invitations</h3><p>View code status, class assignment and remaining uses. Revoke a code to prevent new registrations.</p></div>
   <button className="btn btn-outline btn-small" onClick={()=>void load()} disabled={loading||busy}><RefreshCw size={14}/> Refresh</button>
   <div className="table-overflow" style={{marginTop:14}}><table className="data-table"><thead><tr><th>Code</th><th>Role</th><th>Class</th><th>Uses left</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead><tbody>
   {loading?<tr><td colSpan={7}>Loading invitations…</td></tr>:data.invites.length===0?<tr><td colSpan={7}>No invitations yet. Create one above.</td></tr>:data.invites.map(x=><tr key={x.id}><td><code>{x.code}</code></td><td>{x.role}</td><td>{x.class_id?names.get(x.class_id)??'Class unavailable':'—'}</td><td>{x.uses_left}</td><td>{x.expires_at?new Date(x.expires_at).toLocaleDateString():'Never'}</td><td>{state(x)}</td><td><div className="row-actions"><button title="Copy code" aria-label="Copy invitation" onClick={()=>void copy(x.code)}><Copy size={15}/></button>{state(x)==='Ready'&&<button className="btn btn-outline btn-small" disabled={busy} onClick={()=>{if(window.confirm('Revoke this invitation? This cannot remove people already registered.'))void mutate({action:'revoke',id:x.id});}}>Revoke</button>}</div></td></tr>)}
   </tbody></table></div><p className="subhead" style={{marginTop:12}}>Showing the 100 newest invitations. Codes should be shared privately. Existing accounts are not deleted when an invitation expires.</p>
  </div>
 </section>;
}
