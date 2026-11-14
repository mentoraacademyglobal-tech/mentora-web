type IconProps = { className?: string };

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const PlayIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} fill="currentColor" stroke="none">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
  </svg>
);

export const PauseIcon = ({ className }: IconProps) => (
  <svg {...base} className={className} fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const BackIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M10 15.5v-5l-1.5 1" />
    <path d="M13 12.5a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0" />
  </svg>
);

export const ForwardIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
    <path d="M10 15.5v-5l-1.5 1" />
    <path d="M13 12.5a1.5 2 0 1 0 3 0 1.5 2 0 1 0-3 0" />
  </svg>
);

export const VolumeIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const MutedIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m16 9 5 6m0-6-5 6" />
  </svg>
);

export const EnterFullscreenIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const ExitFullscreenIcon = ({ className }: IconProps) => (
  <svg {...base} className={className}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
);
