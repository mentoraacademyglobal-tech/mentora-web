'use client';
import { useState } from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';
import { demoMode } from '@/lib/demo';
export default function Login(){
 const router=useRouter();
 const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[message,setMessage]=useState('');const[loading,setLoading]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setMessage('');try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
   if(!url||!key) throw new Error('Supabase environment variables are missing');
   const client=createBrowserClient(url,key);const {data:session,error}=await client.auth.signInWithPassword({email,password});
   if(error)throw error;
   if(!session.user) throw new Error('No authenticated user returned.');
   const {error: invitationError}=await client.rpc('mm_accept_staff_invitations');
   if(invitationError)throw new Error('Account setup is unavailable. Contact the academy.');
   const {data:membership,error:roleError}=await client.from('memberships').select('organisation_id')
      .eq('user_id',session.user.id).eq('status','active').in('role',['admin','super_admin','academic_admin','finance_admin','content_manager','inventory_manager','teacher']).limit(1).maybeSingle();
   if(roleError||!membership){await client.auth.signOut();throw new Error('This account does not have active access to the manager portal. Contact your academy administrator.');}
   router.replace('/dashboard');router.refresh();
 }catch(err){setMessage(err instanceof Error?err.message:'Sign in failed');}finally{setLoading(false);}}
 return <main className="login-screen"><form className="login-card" onSubmit={submit}><div className="brand-big"><Image src="/logos-svg/mentora-logo-icon.svg" width={40} height={40} alt="Mentora" /> Mentora<span className="mint-text">.</span></div><p className="kicker">MANAGER PORTAL</p><h1>Welcome back</h1><p className="muted">Sign in with your academy staff account.</p>{demoMode&&<p className="note">Demo mode is active. <Link href="/dashboard">Open preview →</Link></p>}<label>Email address<input name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@mentora.lk" /></label><label>Password<input name="password" autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{message&&<p role="alert" className="error">{message}</p>}<button aria-busy={loading} disabled={loading} type="submit" className="btn btn-primary">{loading?'Signing in…':'Sign in →'}</button></form></main>
}
