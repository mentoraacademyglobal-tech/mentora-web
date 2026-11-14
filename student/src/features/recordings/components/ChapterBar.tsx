"use client";

import { useRef, useState } from "react";
import { formatTimestamp, spokenTime, type Chapter } from "../recordings";

type Props = {
  duration: number;
  currentTime: number;
  chapters: Chapter[];
  onSeek: (seconds: number) => void;
};

type Segment = { start: number; end: number; title: string };

function buildSegments(chapters: Chapter[], duration: number): Segment[] {
  if (duration <= 0) return [];
  if (chapters.length === 0) return [{ start: 0, end: duration, title: "" }];

  const points = chapters.filter((c) => c.start < duration);
  const segments: Segment[] = [];
  if (points[0] && points[0].start > 0) segments.push({ start: 0, end: points[0].start, title: "" });
  points.forEach((c, i) => {
    segments.push({ start: c.start, end: points[i + 1]?.start ?? duration, title: c.title });
  });
  return segments;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

// A progress bar divided at each chapter start, so the shape of the lesson is visible and
// students can jump to a topic by touch.
export default function ChapterBar({ duration, currentTime, chapters, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);

  const segments = buildSegments(chapters, duration);
  const shown = scrub ?? currentTime;

  const timeAt = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  const titleAt = (seconds: number) => {
    const segment = [...segments].reverse().find((s) => s.start <= seconds);
    return segment?.title ?? "";
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 30 : 5;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") onSeek(clamp(currentTime + step, 0, duration));
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") onSeek(clamp(currentTime - step, 0, duration));
    else if (event.key === "Home") onSeek(0);
    else if (event.key === "End") onSeek(duration);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const here = titleAt(shown);
  const valueText = `${spokenTime(shown)} of ${spokenTime(duration)}${here ? `, ${here}` : ""}`;
  const tipTime = hover ?? scrub;

  return (
    <div className="relative">
      {tipTime !== null && duration > 0 ? (
        <div
          className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-ink"
          style={{ left: `${clamp((tipTime / duration) * 100, 8, 92)}%` }}
        >
          <span className="tabular-nums">{formatTimestamp(tipTime)}</span>
          {titleAt(tipTime) ? <span className="ml-2 text-slate-text">{titleAt(tipTime)}</span> : null}
        </div>
      ) : null}

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.max(Math.floor(duration), 0)}
        aria-valuenow={Math.floor(shown)}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          if (duration <= 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setScrub(timeAt(e.clientX));
        }}
        onPointerMove={(e) => {
          if (duration <= 0) return;
          const t = timeAt(e.clientX);
          if (scrub !== null) setScrub(t);
          else if (e.pointerType === "mouse") setHover(t);
        }}
        onPointerUp={(e) => {
          if (scrub !== null) onSeek(timeAt(e.clientX));
          setScrub(null);
        }}
        onPointerCancel={() => setScrub(null)}
        onPointerLeave={() => setHover(null)}
        className="group/bar flex h-11 cursor-pointer touch-none items-center gap-[3px] rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
      >
        {segments.map((segment) => {
          const span = segment.end - segment.start;
          const fill = span > 0 ? clamp((shown - segment.start) / span, 0, 1) : 0;
          return (
            <div
              key={segment.start}
              className="flex h-full items-center"
              style={{ flexGrow: span, flexBasis: 0, minWidth: 6 }}
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a5a6a] transition-[height] group-hover/bar:h-2.5 group-focus-visible/bar:h-2.5">
                <div className="h-full bg-mint" style={{ width: `${fill * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
