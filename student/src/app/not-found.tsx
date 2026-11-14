import type { Metadata } from "next";
import Link from "next/link";
import { primaryButton } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
        <p className="text-5xl font-bold text-mint">404</p>
        <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
        <p className="mb-8 mt-2 text-sm text-slate-text">
          The link may be old, or the class or recording may have been removed.
          If you think this is a mistake, ask your academy.
        </p>
        <Link href="/dashboard" className={`${primaryButton} inline-flex items-center`}>
          Go to your dashboard
        </Link>
      </div>
    </main>
  );
}
