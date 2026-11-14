"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { activeHref, NAV, studentSections, type NavItem } from "./nav";

export default function PortalNav({ items: initialItems, layout }: { items?: NavItem[]; layout: "side" | "tabs" }) {
  const pathname = usePathname();
  const items = initialItems ?? NAV.student;
  const active = activeHref(items, pathname);
  if (layout === "tabs") return (
    <nav aria-label="Quick navigation" className="flex gap-2 overflow-x-auto px-3 py-2 lg:hidden">
      {items.map(item => <Link key={item.href} href={item.href} aria-current={active === item.href ? "page" : undefined}
        className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${active === item.href ? "bg-mint text-deep" : "text-[#bed6db]"}`}>
        <Icon name={item.icon} className="h-4 w-4" />{item.label}
      </Link>)}
    </nav>
  );
  return (
    <nav aria-label="Student portal" className="student-nav-scroll min-h-0 flex-1 space-y-5 overflow-y-auto pr-2">
      {studentSections.map(section => (
        <div key={section.label}>
          <p className="mb-2 px-3 text-[10px] font-extrabold tracking-[.16em] text-[#749da9]">{section.label}</p>
          <div className="space-y-1">{section.items.map(item => {
            const on = active === item.href;
            return <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined}
              className={`student-nav-link group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint ${on ? "bg-[#eaf4f6] text-[#062a35]" : "text-[#b6d0d7] hover:bg-white/10 hover:text-white"}`}>
              <Icon name={item.icon} className={`h-[17px] w-[17px] ${on ? "text-[#079e79]" : "text-[#9abac4] group-hover:text-white"}`} />
              <span>{item.label}</span>
              {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#10dc9e]" />}
            </Link>;
          })}</div>
        </div>
      ))}
    </nav>
  );
}
