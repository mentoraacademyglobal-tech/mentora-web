"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { NAV } from "./nav";

type Props = { name: string; roleLabel: string; dateLabel: string };
export default function TopBar({ name }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const matches = search.trim().length > 0 ? NAV.student.filter(item => item.label.toLowerCase().includes(search.toLowerCase())).slice(0, 5) : [];
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(matches[0]?.href ?? `/materials?q=${encodeURIComponent(search.trim())}`);
    setSearch("");
  }
  return <header className="student-topbar z-20 hidden shrink-0 items-center justify-between gap-5 border-b border-line bg-card/95 px-6 py-4 backdrop-blur lg:flex xl:px-9">
    <form onSubmit={handleSearch} role="search" className="relative w-full max-w-[390px]">
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-text" />
      <input aria-label="Search portal" onKeyDown={e=>{if(e.key==="Escape")setSearch("");}} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your portal..." className="h-10 w-full rounded-xl border border-line bg-page pl-10 pr-4 text-xs text-ink outline-none transition focus:border-mint focus:ring-2 focus:ring-mint/20" />
      {matches.length > 0 && <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-xl">{matches.map(item => <button key={item.href} type="button" onClick={() => {router.push(item.href);setSearch("");}} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-ink hover:bg-mist"><Icon name={item.icon} className="h-4 w-4 text-slate-text" />{item.label}</button>)}</div>}
    </form>
    <div className="flex shrink-0 items-center gap-2">
      <span className="rounded-lg border border-line px-3 py-2 text-[11px] font-bold text-slate-text">ENG</span>
      <Link href="/messages" aria-label="Announcements" title="Announcements" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-slate-text transition hover:bg-mist"><Icon name="mail" className="h-[17px] w-[17px]" /></Link>
      <Link href="/schedule" aria-label="Upcoming lessons" title="Upcoming lessons" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-slate-text transition hover:bg-mist"><Icon name="bell" className="h-[17px] w-[17px]" /></Link>
      <Link href="/profile" className="ml-2 flex items-center gap-2.5 rounded-xl border border-line bg-card px-2 py-1.5 transition hover:bg-mist"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-deep text-sm font-bold text-mint">{name.charAt(0).toUpperCase()}</span><span className="max-w-[128px]"><strong className="block truncate text-xs leading-tight text-ink">{name}</strong><small className="text-[10px] text-slate-text">Student</small></span><Icon name="chevron-down" className="h-3 w-3 text-slate-text" /></Link>
    </div>
  </header>;
}
