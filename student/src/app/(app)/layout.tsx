import StudentPresence from "@/components/analytics/StudentPresence";
import { Suspense } from "react";
import ShellLoader from "@/components/layout/ShellLoader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page" aria-busy="true">
          <p className="text-sm text-slate-text">Loading Mentora</p>
        </div>
      }
    >
      <ShellLoader><StudentPresence />{children}</ShellLoader>
    </Suspense>
  );
}
