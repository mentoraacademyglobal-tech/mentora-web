import Link from "next/link";

// Shared building blocks for the dashboards, so every card looks the same.

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[20px] border border-line bg-card p-5 ${className}`}>
      {title || action ? (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title ? <h2 className="text-base font-bold">{title}</h2> : <span />}
          {action ? (
            <Link
              href={action.href}
              className="text-sm font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure"
            >
              {action.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-card p-5">
      <p className="text-sm text-slate-text">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-text">{hint}</p> : null}
    </div>
  );
}

export function Hero({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-[20px] bg-deep p-6 text-white">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children ? <div className="mt-2 max-w-xl text-sm leading-6 text-deep-mut">{children}</div> : null}
    </section>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-text">{children}</p>;
}
