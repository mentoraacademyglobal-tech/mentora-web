"use client";

import AccessibleDialog from "@/components/ui/AccessibleDialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/layout/Icon";

type ClassOption = { id: string; name: string };

export default function NewThreadModal({ classes }: { classes: ClassOption[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/student/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          course_id: courseId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to create discussion topic");

      setOpen(false);
      setName("");
      setDescription("");
      setCourseId("");
      router.refresh();
      if (json.thread?.id) {
        router.push(`/forum/${json.thread.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="student-action student-action-primary"
      >
        <Icon name="plus" className="h-4 w-4" /> Start Discussion
      </button>

      {open && (
        <AccessibleDialog label="New discussion" onClose={()=>{if(!submitting)setOpen(false);}}>
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-extrabold text-ink">New Discussion Topic</h3>
                <p className="text-xs text-slate-text">Create an academic topic for your classmates or academy.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close discussion"
                className="text-lg font-bold text-slate-text hover:text-ink"
              >
                ×
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="discussion-title" className="text-xs font-bold text-ink">Topic Title *</label>
                <input id="discussion-title"
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Question on 2024 Past Paper Physics Unit 1"
                  className="w-full rounded-xl border border-line bg-page p-2.5 text-xs text-ink focus:border-mint focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="discussion-class" className="text-xs font-bold text-ink">Target Class (Optional)</label>
                <select id="discussion-class"
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-page p-2.5 text-xs text-ink"
                >
                  <option value="">General Academy Discussion</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      Class: {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="discussion-details" className="text-xs font-bold text-ink">Discussion Details / Question *</label>
                <textarea id="discussion-details"
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your question or observation with sufficient context..."
                  className="w-full rounded-xl border border-line bg-page p-2.5 text-xs text-ink focus:border-mint focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="student-action border border-line bg-page text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !description.trim()}
                  className="student-action student-action-primary"
                >
                  {submitting ? "Publishing..." : "Start Discussion"}
                </button>
              </div>
            </form>
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
