"use client";

import Link from "next/link";
import { primaryButton, secondaryButton } from "@/components/ui/styles";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div role="alert" className="w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
        <p className="text-5xl font-bold text-warn">!</p>
        <h1 className="mt-3 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-8 mt-2 text-sm text-slate-text">
          That did not work, and it was not your fault. Try again. If it keeps
          happening, tell your academy what you were doing.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-slate-text">ref: {error.digest}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={primaryButton}>
            Try again
          </button>
          <Link href="/dashboard" className={`${secondaryButton} inline-flex h-12 items-center`}>
            Go to your dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
