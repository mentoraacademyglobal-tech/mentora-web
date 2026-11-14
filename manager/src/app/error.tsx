"use client";
import Link from 'next/link';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}){return <section className="page-content" role="alert"><h1>This page could not load</h1><p>Your connection or the service may be temporarily unavailable. Try again.</p><div className="heading-actions"><button className="btn btn-primary" onClick={reset}>Try again</button><Link className="btn btn-outline" href="/dashboard">Back to dashboard</Link></div></section>;}
