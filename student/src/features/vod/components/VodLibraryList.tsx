"use client";

import { useState } from "react";
import Icon from "@/components/layout/Icon";
import VodModalPlayer from "./VodModalPlayer";

type VideoItem = {
  id: string;
  video_id: string;
  expires_at: string | null;
  revoked_at: string | null;
  mm_videos: { name: string; description?: string | null } | { name: string; description?: string | null }[] | null;
};

export default function VodLibraryList({
  videos,
  studentName,
}: {
  videos: VideoItem[];
  studentName: string;
}) {
  const [activeVideo, setActiveVideo] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className="space-y-2">
      {videos.map(v => {
        const vidObj = Array.isArray(v.mm_videos) ? v.mm_videos[0] : v.mm_videos;
        const title = vidObj?.name || "On-demand video";
        return (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-page p-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint/10 text-[#0aa178]">
                <Icon name="play" className="h-4 w-4" />
              </span>
              <div>
                <strong className="block text-xs font-bold text-ink">{title}</strong>
                <small className="text-slate-text">
                  {v.expires_at ? `Access until ${new Date(v.expires_at).toLocaleDateString("en-LK")}` : "Full access"}
                </small>
              </div>
            </div>
            <button
              onClick={() => setActiveVideo({ id: v.video_id, title })}
              className="student-action student-action-primary text-xs"
            >
              <Icon name="play" className="h-3.5 w-3.5" /> Watch Video
            </button>
          </div>
        );
      })}

      {activeVideo && (
        <VodModalPlayer
          videoId={activeVideo.id}
          videoTitle={activeVideo.title}
          studentName={studentName}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
