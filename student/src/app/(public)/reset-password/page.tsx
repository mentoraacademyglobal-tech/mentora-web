import type { Metadata } from "next";
import Link from "next/link";
import MentoraLogo from "@/components/layout/MentoraLogo";
import { ResetForm } from "@/features/identity";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/login" aria-label="Mentora home" className="transition-transform hover:scale-105">
            <MentoraLogo variant="stacked" theme="dark" className="h-24 w-auto object-contain" priority />
          </Link>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="mb-6 mt-1 text-sm text-slate-text">You are signed in from your email link. Set a new password to finish.</p>
          <ResetForm />
        </div>
      </div>
    </main>
  );
}
