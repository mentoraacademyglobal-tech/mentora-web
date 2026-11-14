"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ThreadReplyBox({ threadId }: { threadId: string }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/student/forum/${threadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to post reply");
      setContent("");
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="student-card space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-ink">Post a Reply</label>
        <span className="text-[11px] text-slate-text">Maintain academic courtesy and respectful conduct.</span>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-2.5 text-xs text-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-mint/20 bg-mint/10 p-2.5 text-xs text-[#0a8966]">
          Reply posted successfully!
        </div>
      )}

      <textarea
        rows={3}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Type your question, answer or observation here..."
        className="w-full rounded-xl border border-line bg-page p-3 text-xs text-ink placeholder:text-slate-text/60 focus:border-mint focus:outline-none"
        disabled={submitting}
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="student-action student-action-primary text-xs"
        >
          {submitting ? "Posting..." : "Post Reply"}
        </button>
      </div>
    </form>
  );
}
