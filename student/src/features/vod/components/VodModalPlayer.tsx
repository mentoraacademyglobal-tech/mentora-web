"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  videoId: string;
  videoTitle: string;
  studentName: string;
  onClose: () => void;
};

const WATERMARK_POSITIONS: { top?: string; bottom?: string; left?: string; right?: string }[] = [
  { top: "18px", right: "24px" },
  { bottom: "36px", left: "24px" },
  { top: "28px", left: "28px" },
  { bottom: "44px", right: "28px" },
  { top: "42%", right: "32px" },
  { top: "42%", left: "32px" },
];

export default function VodModalPlayer({ videoId, videoTitle, studentName, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playbackData, setPlaybackData] = useState<{
    id: string;
    name: string;
    description: string | null;
    subject: string | null;
    youtube_video_id: string | null;
    video_asset_ref: string | null;
  } | null>(null);

  // Dynamic floating watermark position
  const [posIdx, setPosIdx] = useState(0);
  const [liveClock, setLiveClock] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/student/videos/${videoId}/playback`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unable to load video playback");
        setPlaybackData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Playback error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [videoId]);

  // Clock & watermark position rotation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString("en-LK", { hour12: false }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    const posInterval = setInterval(() => {
      setPosIdx(prev => (prev + 1) % WATERMARK_POSITIONS.length);
    }, 14000);
    return () => {
      clearInterval(clockInterval);
      clearInterval(posInterval);
    };
  }, []);

  const curPos = WATERMARK_POSITIONS[posIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        onContextMenu={e => e.preventDefault()}
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#062a35] text-white shadow-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="min-w-0 pr-3">
            <h3 className="truncate text-sm font-extrabold text-white">{videoTitle}</h3>
            <span className="text-[11px] text-[#86bfaf]">Mentora Protected Video on Demand</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Video Canvas */}
        <div className="relative aspect-video w-full bg-black">
          {loading && (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs font-semibold text-mint">Securing playback session...</span>
            </div>
          )}

          {error && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="text-sm font-bold text-[#ff8b94]">{error}</span>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                Close player
              </button>
            </div>
          )}

          {!loading && !error && playbackData && (
            <>
              {playbackData.youtube_video_id ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${playbackData.youtube_video_id}?autoplay=1&modestbranding=1&rel=0`}
                  title={playbackData.name}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : playbackData.video_asset_ref ? (
                <video
                  src={playbackData.video_asset_ref}
                  controls
                  autoPlay
                  controlsList="nodownload"
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xs text-slate-400">Video source stream not available</span>
                </div>
              )}

              {/* Dynamic anti-piracy moving watermark */}
              <div
                style={{
                  position: "absolute",
                  ...curPos,
                  transition: "all 1.6s ease-in-out",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                className="rounded bg-black/40 px-2.5 py-1 text-[11px] font-mono tracking-wider text-white/50 backdrop-blur-[1px]"
              >
                {studentName} · {liveClock}
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        {playbackData && (
          <div className="border-t border-white/10 px-5 py-3 text-xs text-[#a0c4cf]">
            <p className="line-clamp-2">{playbackData.description || "Video on demand entitlement active."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
