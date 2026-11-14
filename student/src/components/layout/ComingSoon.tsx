import Link from "next/link";
import { Card } from "@/components/ui/Card";

// For parts of the portal that are designed but not built yet. Says so plainly, and says what is planned.
export default function ComingSoon({
  title,
  planned,
  phase,
  back = { href: "/dashboard", label: "Back to your dashboard" },
}: {
  title: string;
  planned: string;
  phase: string;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <p className="inline-block rounded-full bg-warn-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-warn">
          Coming soon
        </p>
        <p className="mt-3 max-w-prose text-sm leading-6">{planned}</p>
        <p className="mt-3 text-xs text-slate-text">Planned for {phase}.</p>
        <Link href={back.href} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">
          {back.label}
        </Link>
      </Card>
    </div>
  );
}
