import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/identity";
import Banner from "@/components/ui/Banner";
import MentoraLogo from "@/components/layout/MentoraLogo";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Sign in" };

type Search = Promise<{ next?: string; error?: string; notice?: string }>;

async function Content({ searchParams }: { searchParams: Search }) {
  const { next, error, notice } = await searchParams;
  return (
    <>
      <Banner error={error} notice={notice} />
      <LoginForm next={safeNext(next)} />
    </>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Search }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-deep px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/login" aria-label="Mentora home" className="transition-transform hover:scale-105">
            <MentoraLogo variant="stacked" theme="dark" className="h-24 w-auto object-contain" priority />
          </Link>
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-slate-text">
            Sign in with your email and password.
          </p>
          <div className="flex flex-col gap-5">
            <Suspense fallback={<div className="h-64" aria-hidden="true" />}>
              <Content searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-deep-mut">
          New to Mentora?{" "}
          <Link href="/register" className="font-bold text-mint underline underline-offset-4">
            Create your account
          </Link>
        </p>
      </div>
    </main>
  );
}
