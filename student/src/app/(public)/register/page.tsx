import type { Metadata } from "next";
import Link from "next/link";
import MentoraLogo from "@/components/layout/MentoraLogo";
import { RegisterForm } from "@/features/identity";

export const metadata: Metadata = { title: "Student registration | Mentora" };

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-page">
      <header className="border-b border-white/10 bg-deep px-5 py-5 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/login" aria-label="Mentora"><MentoraLogo variant="stacked" theme="dark" className="h-14 w-auto object-contain" priority /></Link>
          <Link href="/login" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold transition hover:bg-white/10">Sign in →</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-10 sm:px-6">
        <div className="mb-8"><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#0a9e76]">MENTORA STUDENT PORTAL</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Create your student account</h1><p className="mt-3 max-w-2xl text-sm text-slate-text">Get started with Mentora. No registration code is needed. Your classes will appear after you&apos;re enrolled by the academy or use a class code after registration.</p></div>
        <section className="rounded-3xl border border-line bg-card p-5 shadow-lg sm:p-8 lg:p-10"><RegisterForm /></section>
        <p className="mt-6 text-center text-sm text-slate-text">Already registered? <Link href="/login" className="font-bold text-[#0a9d75] underline underline-offset-4">Sign in</Link></p>
      </div>
    </main>
  );
}
