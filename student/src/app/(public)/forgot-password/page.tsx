import type { Metadata } from "next";
import Link from "next/link";
import MentoraLogo from "@/components/layout/MentoraLogo";
import { ForgotForm } from "@/features/identity";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/login" aria-label="Mentora home" className="transition-transform hover:scale-105">
            <MentoraLogo variant="stacked" theme="dark" className="h-24 w-auto object-contain" priority />
          </Link>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mb-6 mt-1 text-sm text-slate-text">
            Enter your email and we will send you a link to choose a new password.
          </p>
          <ForgotForm />
        </div>
        <p className="mt-6 text-center text-sm text-deep-mut">
          <Link href="/login" className="font-bold text-mint underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
