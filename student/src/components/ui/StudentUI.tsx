import Link from "next/link";
import Icon from "@/components/layout/Icon";
import type { ExtendedIcon } from "@/components/layout/Icon";

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: {href: string; label: string} }) {
  return <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>{eyebrow && <p className="student-kicker mb-2">{eyebrow}</p>}<h1 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[31px]">{title}</h1><p className="mt-1 text-[13px] leading-6 text-slate-text">{subtitle}</p></div>
    {action && <Link className="student-action student-action-primary self-start" href={action.href}>{action.label}<Icon name="arrow-right" className="h-4 w-4" /></Link>}
  </header>;
}
export function Metric({ label, value, detail, icon }: {label: string; value: string | number; detail?:string; icon?:ExtendedIcon}) {
  return <div className="student-metric"><div className="mb-3 flex items-center justify-between gap-2"><span className="text-[12px] font-semibold text-slate-text">{label}</span>{icon && <span className="rounded-lg bg-mint/10 p-2 text-[#0ba778]"><Icon name={icon} className="h-4 w-4" /></span>}</div><p className="student-metric-value">{value}</p>{detail && <p className="mt-1 text-[11px] text-slate-text">{detail}</p>}</div>;
}
export function Surface({ title, description, link, children, className="" }: {title?:string;description?:string;link?:{href:string;label:string};children:React.ReactNode;className?:string}) {
  return <section className={`student-card p-5 sm:p-6 ${className}`}>{(title || link) && <div className="mb-5 flex items-start justify-between gap-3"><div>{title && <h2 className="text-[15px] font-extrabold tracking-tight text-ink">{title}</h2>}{description && <p className="mt-1 text-xs text-slate-text">{description}</p>}</div>{link && <Link className="shrink-0 text-[12px] font-bold text-[#078e70] hover:underline" href={link.href}>{link.label} →</Link>}</div>}{children}</section>;
}
export function BlankState({ icon="file", title, description, action }: {icon?:ExtendedIcon;title:string;description:string;action?:{href:string;label:string}}){
  return <div className="flex flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-3 rounded-2xl bg-mist p-3 text-slate-text"><Icon name={icon} className="h-6 w-6" /></div><p className="text-sm font-bold text-ink">{title}</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-text">{description}</p>{action && <Link href={action.href} className="student-action student-action-secondary mt-5">{action.label}<Icon name="arrow-right" className="h-3 w-3" /></Link>}</div>;
}
export function Pill({ status }: {status:string}) { const positive=["active","approved","completed","paid","published","delivered","graded"].includes(status.toLowerCase()); const negative=["rejected","cancelled","refunded","failed"].includes(status.toLowerCase()); return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${positive ? "bg-[#ddf9ec] text-[#0b7b52]" : negative ? "bg-[#ffe7e7] text-[#a33a3a]" : "bg-[#fff1d6] text-[#91600b]"}`}>{status.replace(/_/g," ")}</span>; }
export function formatLkr(value:number | string | null | undefined){return new Intl.NumberFormat("en-LK",{style:"currency",currency:"LKR",maximumFractionDigits:2}).format(Number(value??0));}
