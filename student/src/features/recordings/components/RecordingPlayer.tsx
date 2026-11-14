"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChapterBar from "./ChapterBar";
import {
  BackIcon,
  EnterFullscreenIcon,
  ExitFullscreenIcon,
  ForwardIcon,
  MutedIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
} from "./icons";
import { currentChapterIndex, formatTimestamp, type Chapter } from "../recordings";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
};

type YTEvent = { data: number; target: YTPlayer };

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: YTEvent) => void;
        onStateChange?: (event: YTEvent) => void;
        onError?: (event: YTEvent) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };

let apiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("The video service could not be reached. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

const RATES = [1, 1.25, 1.5, 1.75, 2, 0.75];
const SAVE_EVERY_MS = 15000;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const iconButton =
  "flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-white hover:bg-[#0e4455] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint";

const WATERMARK_POSITIONS: { top?: string; bottom?: string; left?: string; right?: string }[] = [
  { top: "18px", right: "24px" },
  { bottom: "36px", left: "24px" },
  { top: "28px", left: "28px" },
  { bottom: "44px", right: "28px" },
  { top: "42%", right: "32px" },
  { top: "42%", left: "32px" },
];

// A viewer label outside the embedded player. YouTube policy prohibits overlays obscuring its player.
function Watermark({ text }: { text: string }) {
  return (
    <div className="border-b border-white/10 bg-[#072b35] px-3 py-2 text-center text-xs font-semibold tracking-wide text-[#9ddbcc]" aria-label="Viewer session identification">
      Personalised session: {text}
    </div>
  );
}

type Props = {
  recordingId: string;
  title: string;
  chapters: Chapter[];
  durationHint: number | null;
  watermark: string;
};

export default function RecordingPlayer({ recordingId, title, chapters, durationHint, watermark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const timeRef = useRef(0);
  const lastSaveRef = useRef(0);

  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorText, setErrorText] = useState("");
  const [resumeAt, setResumeAt] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [muted, setMuted] = useState(false);
  const [rateIndex, setRateIndex] = useState(0);
  const [nativeFs, setNativeFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);
  const [wmIndex, setWmIndex] = useState(0);
  const [liveStamp, setLiveStamp] = useState("");

  const immersive = nativeFs || pseudoFs;

  // Drift moving watermark periodically across unobstructed quadrants
  useEffect(() => {
    const id = setInterval(() => {
      setWmIndex((prev) => (prev + 1) % WATERMARK_POSITIONS.length);
      setLiveStamp(new Date().toLocaleTimeString("en-LK", { hour12: false }));
    }, 14000);
    return () => clearInterval(id);
  }, []);

  const saveProgress = useCallback((isCompleted?: boolean) => {
    const seconds = Math.floor(timeRef.current);
    if (seconds <= 0) return;
    lastSaveRef.current = performance.now();
    const completed = Boolean(isCompleted || (duration > 0 && seconds >= duration * 0.9));
    fetch(`/api/recordings/${recordingId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds, completed }),
      keepalive: true,
    }).catch(() => {});
  }, [recordingId, duration]);

  const enterImmersive = useCallback(() => {
    const el = containerRef.current as FsElement | null;
    if (!el) return;
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (!request) {
      setPseudoFs(true);
      return;
    }
    Promise.resolve(request.call(el)).catch(() => setPseudoFs(true));
  }, []);

  const exitImmersive = useCallback(() => {
    setPseudoFs(false);
    const doc = document as FsDocument;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      Promise.resolve(doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()).catch(() => {});
    }
  }, []);

  // Fetch the video ID (only for people allowed to watch), then create the player.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let player: YTPlayer | null = null;
    let holder: HTMLDivElement | null = null;

    (async () => {
      try {
        const res = await fetch(`/api/recordings/${recordingId}/playback`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as { video_id?: string; resume_at?: number; error?: string } | null;
        if (!res.ok || !body?.video_id) throw new Error(body?.error || "The lesson could not be loaded.");

        await loadYouTubeApi();
        if (cancelled || !holderRef.current || !window.YT) return;

        const resume = Math.max(0, Math.floor(Number(body.resume_at) || 0));
        holder = document.createElement("div");
        holderRef.current.appendChild(holder);

        player = new window.YT.Player(holder, {
          host: "https://www.youtube-nocookie.com",
          videoId: body.video_id,
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 1,
            disablekb: 0,
            fs: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            start: resume,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              const iframe = event.target.getIframe();
              iframe.setAttribute("title", title);
              iframe.tabIndex = 0;
              iframe.style.pointerEvents = "auto";
              const d = event.target.getDuration();
              if (d > 0) setDuration(d);
              setResumeAt(resume);
              setCurrentTime(resume);
              timeRef.current = resume;
              setStatus("ready");
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              if (state === 1) {
                const d = event.target.getDuration();
                if (d > 0) setDuration(d);
                setStarted(true);
                setEnded(false);
                setPlaying(true);
              } else if (state === 2 || state === 0) {
                setPlaying(false);
                if (state === 0) {
                  setEnded(true);
                  saveProgress(true);
                } else {
                  saveProgress(false);
                }
                timeRef.current = event.target.getCurrentTime();
                setCurrentTime(timeRef.current);
                // Pausing leaves full screen, so the controls and notes are within reach.
                exitImmersive();
              }
            },
            onError: () => {
              if (cancelled) return;
              setErrorText("This video is not available right now. Tell your teacher if it keeps happening.");
              setStatus("error");
            },
          },
        });
        playerRef.current = player;
      } catch (err) {
        if (cancelled) return;
        setErrorText(err instanceof Error && err.message ? err.message : "The lesson could not be loaded.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      player?.destroy();
      playerRef.current = null;
      holder?.remove();
    };
  }, [recordingId, attempt, title, saveProgress, exitImmersive]);

  // Keep the clock moving and save progress while playing.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      timeRef.current = t;
      setCurrentTime(t);
      if (performance.now() - lastSaveRef.current > SAVE_EVERY_MS) saveProgress(false);
    }, 250);
    return () => clearInterval(id);
  }, [playing, saveProgress]);

  // Save when the page is hidden or closed.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") saveProgress(false);
    };
    window.addEventListener("pagehide", () => saveProgress(false));
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", () => saveProgress(false));
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [saveProgress]);

  // Follow the browser's own full screen state (for example when Escape is pressed).
  useEffect(() => {
    const onChange = () => {
      const doc = document as FsDocument;
      setNativeFs((doc.fullscreenElement ?? doc.webkitFullscreenElement) === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // The full-window fallback should not let the page scroll underneath.
  useEffect(() => {
    if (!pseudoFs) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [pseudoFs]);

  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (ended) player.seekTo(0, true);
    player.playVideo();
    // Starting playback is the person's own tap, which is what lets the browser go full screen.
    if (!(document.fullscreenElement || pseudoFs)) enterImmersive();
  }, [ended, pseudoFs, enterImmersive]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || status !== "ready") return;
    if (player.getPlayerState() === 1) player.pauseVideo();
    else play();
  }, [play, status]);

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    const target = clamp(seconds, 0, duration > 0 ? duration : seconds);
    player.seekTo(target, true);
    timeRef.current = target;
    setCurrentTime(target);
  }, [duration]);

  const seekBy = useCallback(
    (delta: number) => {
      const player = playerRef.current;
      if (player) seekTo(player.getCurrentTime() + delta);
    },
    [seekTo],
  );

  const jumpTo = useCallback(
    (seconds: number) => {
      seekTo(seconds);
      const player = playerRef.current;
      if (player && player.getPlayerState() !== 1) play();
    },
    [play, seekTo],
  );

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) player.unMute();
    else player.mute();
    setMuted(player.isMuted());
  };

  const cycleRate = () => {
    const next = (rateIndex + 1) % RATES.length;
    playerRef.current?.setPlaybackRate(RATES[next]);
    setRateIndex(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && pseudoFs) {
      exitImmersive();
      return;
    }
    const target = event.target as HTMLElement;
    const onSlider = Boolean(target.closest("[role='slider']"));
    const onButton = Boolean(target.closest("button"));
    const key = event.key.toLowerCase();

    if (key === " " && !onButton && !onSlider) togglePlay();
    else if (key === "k") togglePlay();
    else if (key === "j") seekBy(-10);
    else if (key === "l") seekBy(10);
    else if (key === "arrowleft" && !onSlider) seekBy(-5);
    else if (key === "arrowright" && !onSlider) seekBy(5);
    else if (key === "m") toggleMute();
    else if (key === "f") (immersive ? exitImmersive : enterImmersive)();
    else return;
    event.preventDefault();
  };

  const chapterIndex = currentChapterIndex(chapters, currentTime);
  const ready = status === "ready";
  const showPill = ready && (!started || ended);
  const pillLabel = ended ? "Watch again" : resumeAt >= 10 ? `Resume at ${formatTimestamp(resumeAt)}` : "Watch lesson";

  const containerClass = pseudoFs
    ? "fixed inset-0 z-50 flex flex-col"
    : nativeFs
      ? "relative flex h-full flex-col"
      : "relative overflow-hidden rounded-2xl";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div
        ref={containerRef}
        role="group"
        aria-label={`Video player: ${title}`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        className={`select-none bg-deep text-white ${containerClass}`}
      >
        <div className={`relative bg-[#031a21] ${immersive ? "min-h-0 flex-1" : "aspect-video"}`}>
          <div ref={holderRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />

          {/* Dynamic moving security watermark overlay across video canvas */}
          {status === "ready" && (
            <div
              className="pointer-events-none absolute z-30 select-none transition-all duration-1000 ease-in-out"
              style={{
                top: WATERMARK_POSITIONS[wmIndex].top,
                bottom: WATERMARK_POSITIONS[wmIndex].bottom,
                left: WATERMARK_POSITIONS[wmIndex].left,
                right: WATERMARK_POSITIONS[wmIndex].right,
              }}
              aria-hidden="true"
            >
              <div className="rounded-lg border border-white/10 bg-black/45 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-white/50 shadow-md backdrop-blur-xs">
                <span className="mr-1.5 font-bold text-mint/70">MENTORA</span>
                {watermark}
                {liveStamp && <span className="ml-1.5 tabular-nums opacity-60">â€¢ {liveStamp}</span>}
              </div>
            </div>
          )}

          {status === "loading" ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <p className="rounded-xl bg-deep px-5 py-3 text-sm text-deep-mut" role="status">
                Getting the lesson ready
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <p role="alert" className="max-w-sm text-sm">
                {errorText}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("loading");
                  setAttempt((a) => a + 1);
                }}
                className="h-11 rounded-xl border border-white px-5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
              >
                Try again
              </button>
            </div>
          ) : null}

          {showPill ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <button
                type="button"
                onClick={play}
                className="flex h-14 items-center gap-3 rounded-2xl bg-mint px-7 text-base font-bold text-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <PlayIcon className="h-5 w-5" />
                {pillLabel}
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative shrink-0 bg-deep">
          <Watermark text={watermark} />
          <div className="px-3 pb-2 pt-1 sm:px-4">
            <ChapterBar duration={duration} currentTime={currentTime} chapters={chapters} onSeek={seekTo} />
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!ready}
                aria-label={playing ? "Pause" : "Play"}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint text-deep disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {playing ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
              </button>
              <button type="button" onClick={() => seekBy(-10)} disabled={!ready} aria-label="Back 10 seconds" className={iconButton}>
                <BackIcon className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => seekBy(10)} disabled={!ready} aria-label="Forward 10 seconds" className={iconButton}>
                <ForwardIcon className="h-6 w-6" />
              </button>
              <span aria-hidden="true" className="ml-1 text-sm tabular-nums text-deep-mut">
                {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={cycleRate}
                disabled={!ready}
                aria-label={`Playback speed ${RATES[rateIndex]} times. Press to change.`}
                className={`${iconButton} text-sm font-bold tabular-nums`}
              >
                {RATES[rateIndex]}x
              </button>
              <button
                type="button"
                onClick={toggleMute}
                disabled={!ready}
                aria-label={muted ? "Turn sound on" : "Mute"}
                className={`${iconButton} hidden sm:flex`}
              >
                {muted ? <MutedIcon className="h-6 w-6" /> : <VolumeIcon className="h-6 w-6" />}
              </button>
              <button
                type="button"
                onClick={immersive ? exitImmersive : enterImmersive}
                aria-label={immersive ? "Leave full screen" : "Full screen"}
                className={iconButton}
              >
                {immersive ? <ExitFullscreenIcon className="h-6 w-6" /> : <EnterFullscreenIcon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside aria-label="Chapters" className="rounded-2xl border border-line bg-card p-2 lg:max-h-[34rem] lg:overflow-y-auto">
        <h2 className="px-3 pb-1 pt-2 text-sm font-bold">Chapters</h2>
        {chapters.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-slate-text">This lesson has no chapters yet.</p>
        ) : (
          <ol>
            {chapters.map((chapter, i) => {
              const current = i === chapterIndex;
              return (
                <li key={chapter.start}>
                  <button
                    type="button"
                    onClick={() => jumpTo(chapter.start)}
                    disabled={!ready}
                    aria-current={current ? "true" : undefined}
                    className={`flex min-h-11 w-full items-baseline gap-3 rounded-xl px-3 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure disabled:opacity-60 ${
                      current ? "bg-info-soft font-medium text-info" : "hover:bg-mist"
                    }`}
                  >
                    <span className={`w-14 shrink-0 tabular-nums ${current ? "" : "text-slate-text"}`}>
                      {formatTimestamp(chapter.start)}
                    </span>
                    <span>{chapter.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </aside>
    </div>
  );
}
