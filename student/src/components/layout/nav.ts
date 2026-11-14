export type IconName =
  | "grid" | "book" | "calendar" | "video" | "chat" | "check"
  | "file" | "bot" | "users" | "chart" | "pen" | "school"
  | "cash" | "bell" | "cog" | "mail" | "trophy" | "play";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  soon?: boolean;
};

export type NavSection = { label: string; items: NavItem[] };
export const PORTAL_LABEL = { student: "Student portal" } as const;

/** Student navigation mirrors the manager's grouped information architecture; staff tools remain on manager.mentora.lk. */
export const studentSections: NavSection[] = [
  { label: "OVERVIEW", items: [{ label: "Dashboard", href: "/dashboard", icon: "grid" }] },
  { label: "LEARNING", items: [
    { label: "My Classes", href: "/classes", icon: "book" },
    { label: "My Syllabus", href: "/syllabus", icon: "file" },
    { label: "Schedule", href: "/schedule", icon: "calendar" },
    { label: "Recordings", href: "/recordings", icon: "video" },
    { label: "My Library", href: "/library", icon: "play" },
    { label: "Materials", href: "/materials", icon: "file" },
    { label: "Assessments", href: "/assessments", icon: "check" },
    { label: "Report Cards", href: "/report-card", icon: "chart" },
  ] },
  { label: "COMMUNITY", items: [
    { label: "Announcements", href: "/messages", icon: "mail" },
    { label: "Discussions", href: "/forum", icon: "chat" },
  ] },
  { label: "MARKETPLACE", items: [
    { label: "Explore Store", href: "/store", icon: "cash" },
    { label: "My Purchases", href: "/purchases", icon: "check" },
    { label: "Rewards & Coins", href: "/rewards", icon: "trophy" },
  ] },
  { label: "ACCOUNT", items: [
    { label: "My Profile", href: "/profile", icon: "users" },
    { label: "Settings", href: "/settings", icon: "cog" },
  ] },
];

export const NAV = { student: studentSections.flatMap(section => section.items) };
export function activeHref(items: NavItem[], pathname: string): string | null {
  const matches = items.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  matches.sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href ?? null;
}
