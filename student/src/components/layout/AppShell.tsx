import Link from "next/link";
import PortalNav from "./PortalNav";
import TopBar from "./TopBar";
import MobileNavDrawer from "./MobileNavDrawer";
import ThemeToggle from "./ThemeToggle";
import Icon from "./Icon";
import MentoraLogo from "./MentoraLogo";
import SubmitButton from "@/components/ui/SubmitButton";
import { signOut } from "@/features/identity/client";

type Props = { portal: "student"; name: string; roleLabel: string; dateLabel: string; children: React.ReactNode };

/** Manager-aligned app shell, deliberately student-only. No portal switcher or staff navigation. */
export default function AppShell({ name, roleLabel, children }: Props) {
  return (
    <div className="student-shell-outer min-h-screen p-0 lg:p-4">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-mint focus:px-4 focus:py-2 focus:text-deep">Skip to content</a>
      <div className="student-shell mx-auto flex min-h-screen w-full max-w-[1720px] overflow-hidden bg-page lg:h-[calc(100vh-2rem)] lg:min-h-0 lg:rounded-[24px] lg:shadow-2xl">
        <div className="student-brand-rail hidden w-[58px] shrink-0 flex-col items-center bg-mint py-5 lg:flex">
          <Link href="/dashboard" aria-label="Mentora dashboard" className="flex h-10 w-10 items-center justify-center rounded-xl bg-deep p-1.5"><MentoraLogo variant="icon" className="h-full w-full object-contain" priority /></Link>
          <div className="mt-auto"><ThemeToggle className="text-deep hover:bg-deep/10" /></div>
        </div>
        <aside className="student-sidebar hidden h-full w-[238px] shrink-0 flex-col bg-side px-3.5 pb-5 pt-6 lg:flex">
          <Link href="/dashboard" aria-label="Mentora student home" className="mb-1 block px-2"><MentoraLogo variant="horizontal" theme="dark" className="h-9 w-auto" priority /></Link>
          <div className="mb-5 ml-2 w-fit rounded-lg border border-mint/20 bg-mint/10 px-2.5 py-1 text-[10px] font-extrabold tracking-[.12em] text-mint">STUDENT PORTAL</div>
          <PortalNav layout="side" />
          <div className="mt-4 border-t border-white/10 pt-3">
            <Link href="/profile" className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-3 text-xs text-white hover:bg-white/10"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-sm font-bold text-deep">{name.charAt(0).toUpperCase()}</span><span className="min-w-0"><strong className="block truncate">{name}</strong><span className="text-[#9dbfc7]">Student account</span></span></Link>
            <form action={signOut}><SubmitButton pendingText="Signing outâ€¦" className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#b6d0d7] hover:bg-white/10 hover:text-white"><Icon name="out" />Log out</SubmitButton></form>
          </div>
        </aside>
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0">
          <MobileNavDrawer portal="student" name={name} roleLabel={roleLabel} />
          <TopBar name={name} roleLabel={roleLabel} dateLabel="" />
          <main id="content" className="student-content min-h-0 flex-1 overflow-y-auto px-4 pb-12 pt-7 sm:px-7 lg:px-8 lg:pt-8 xl:px-10">
            <div className="mx-auto w-full max-w-[1350px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
