import type { IconName } from "./nav";

export type ExtendedIcon =
  | IconName
  | "out"
  | "moon"
  | "sun"
  | "arrow-left"
  | "arrow-right"
  | "plus"
  | "x"
  | "check-circle"
  | "clock"
  | "link"
  | "download"
  | "star"
  | "trophy"
  | "info"
  | "warning"
  | "home"
  | "play"
  | "mail"
  | "search"
  | "filter"
  | "dots-vertical"
  | "chevron-down"
  | "menu"
  | "globe";

const PATHS: Record<ExtendedIcon, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  book: "M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2zm0 0a2 2 0 0 0 2 2h14",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  video: "M3 6h12v12H3zM15 10l6-3v10l-6-3",
  chat: "M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  check: "M9 3h6v3H9zM6 5H5v16h14V5h-1M9 14l2 2 4-4",
  file: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  bot: "M5 8h14v10H5zM12 4v4M9 13h0M15 13h0",
  users:
    "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
  chart: "M3 3v18h18M7 15v3M12 9v9M17 12v6",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  school: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  cash: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4",
  cog: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M10 10v4M16 16v4",
  out: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
  moon: "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  "arrow-left": "M19 12H5M12 5l-7 7 7 7",
  "arrow-right": "M5 12h14M12 5l7 7-7 7",
  plus: "M12 5v14M5 12h14",
  x: "M18 6L6 18M6 6l12 12",
  "check-circle": "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  clock: "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  download: "M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18m-6 14v-4m-3 4h6M5 9v7a7 7 0 0 0 14 0V9M5 9H4m1 0h14m0 0h1",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  warning: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  home: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  play: "M5 3l14 9-14 9V3z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  "dots-vertical": "M12 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0-6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm0 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  "chevron-down": "M6 9l6 6 6-6",
  menu: "M4 6h16M4 12h16M4 18h16",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c-3 3-3 17 0 20M12 2c3 3 3 17 0 20",
};

export default function Icon({
  name,
  className = "h-[18px] w-[18px]",
}: {
  name: ExtendedIcon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${className} flex-none`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
