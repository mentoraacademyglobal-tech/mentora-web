"use client";
import { useEffect, useState } from "react";
import AccessibleDialog from "@/components/ui/AccessibleDialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import MentoraLogo from "./MentoraLogo";
import ThemeToggle from "./ThemeToggle";
import SubmitButton from "@/components/ui/SubmitButton";
import { signOut } from "@/features/identity/client";
import { activeHref, NAV, studentSections } from "./nav";

export default function MobileNavDrawer({name}:{portal:"student";name:string;roleLabel:string}) {
  const [open,setOpen]=useState(false);
  const pathname=usePathname();
  const active=activeHref(NAV.student,pathname);
  useEffect(()=>{ const frame=window.requestAnimationFrame(()=>setOpen(false));return ()=>window.cancelAnimationFrame(frame);},[pathname]);
  return <>
    <div className="relative z-20 flex h-[60px] shrink-0 items-center justify-between bg-side px-4 text-white lg:hidden">
      <button type="button" onClick={()=>setOpen(true)} aria-label="Open student navigation" aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10"><Icon name="menu" className="h-5 w-5" /></button>
      <Link href="/dashboard" aria-label="Mentora dashboard"><MentoraLogo variant="horizontal" theme="dark" className="h-8 w-auto" priority /></Link>
      <div className="flex items-center gap-1"><Link href="/messages" aria-label="Announcements" className="rounded-xl p-2 hover:bg-white/10"><Icon name="bell" /></Link><Link href="/profile" aria-label="Profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-mint text-xs font-bold text-deep">{name.charAt(0).toUpperCase()}</Link></div>
    </div>
    <nav aria-label="Mobile quick links" className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line bg-card px-3 py-2 lg:hidden">
      {NAV.student.slice(0,5).map(item=><Link key={item.href} href={item.href} aria-current={item.href===active?"page":undefined} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold ${item.href===active ? "bg-deep text-mint" : "text-slate-text"}`}><Icon name={item.icon} className="h-3.5 w-3.5" />{item.label}</Link>)}
    </nav>
    {open && <AccessibleDialog label="Student navigation" onClose={()=>setOpen(false)} className="drawer-dialog">
      
      <aside aria-label="Student navigation" className="relative flex h-full w-[286px] max-w-[85vw] flex-col bg-side p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4"><MentoraLogo variant="horizontal" theme="dark" className="h-9 w-auto" /><button type="button" onClick={()=>setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-white/10"><Icon name="x" /></button></div>
        <div className="my-4 flex items-center gap-3 rounded-xl bg-white/5 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint font-bold text-deep">{name.charAt(0).toUpperCase()}</span><span><strong className="block text-xs">{name}</strong><small className="text-mint">STUDENT PORTAL</small></span></div>
        <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="All student pages">{studentSections.map(section=><div key={section.label}><p className="mb-2 px-2 text-[10px] font-extrabold tracking-widest text-[#749da9]">{section.label}</p>{section.items.map(item=><Link onClick={()=>setOpen(false)} key={item.href} href={item.href} aria-current={active===item.href?"page":undefined} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${active===item.href?"bg-mint text-deep":"text-[#c5dce0] hover:bg-white/10"}`}><Icon name={item.icon} className="h-4 w-4" />{item.label}</Link>)}</div>)}</nav>
        <div className="flex items-center justify-between border-t border-white/10 pt-3"><ThemeToggle className="text-mint" /><form action={signOut}><SubmitButton pendingText="Signing outâ€¦" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#c5dce0]"><Icon name="out" />Log out</SubmitButton></form></div>
      </aside>
    </AccessibleDialog>}
  </>;
}
