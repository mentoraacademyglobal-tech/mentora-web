import { one } from "@/lib/relations";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
import ThreadReplyBox from "@/components/forum/ThreadReplyBox";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: "Discussion Thread" };

export default async function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await requireUser();
  const { data: member } = await supabase
    .from("memberships")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) notFound();

  // 1. Fetch thread
  const { data: thread, error: threadErr } = await supabase
    .from("mm_forum_threads")
    .select(`
      id, name, description, status, course_id, student_id, created_at,
      classes ( id, name )
    `)
    .eq("id", id)
    .eq("organisation_id", member.organisation_id)
    .maybeSingle();

  if (threadErr || !thread) notFound();

  const className = one(thread.classes)?.name;

  // 2. Fetch replies / posts
  const { data: posts } = await supabase
    .from("mm_forum_posts")
    .select("id, author_id, author_role, content, created_at")
    .eq("thread_id", thread.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(100);

  // Collect author profiles
  const authorIds = Array.from(new Set([thread.student_id, ...(posts ?? []).map(p => p.author_id)].filter(Boolean)));
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };

  const nameMap = new Map<string, string>();
  (profiles ?? []).forEach(p => nameMap.set(p.id, p.full_name || "Academy Member"));

  const threadAuthor = thread.student_id ? (nameMap.get(thread.student_id) || "Mentora Student") : "Academy Staff";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/forum"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-text hover:text-ink"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" /> Back to Discussions
        </Link>
      </div>

      <PageHeader
        eyebrow={className ? `CLASS DISCUSSION / ${className}` : "ACADEMY FORUM"}
        title={thread.name}
        subtitle={`Started by ${threadAuthor} on ${new Date(thread.created_at).toLocaleDateString("en-LK")}`}
      />

      {/* Main topic post */}
      <article className="student-card space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 font-black text-[#0a8664]">
              {threadAuthor.charAt(0).toUpperCase()}
            </span>
            <div>
              <strong className="block text-sm font-bold text-ink">{threadAuthor}</strong>
              <small className="text-slate-text">{new Date(thread.created_at).toLocaleString("en-LK")}</small>
            </div>
          </div>
          <span className="student-chip">Topic Starter</span>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {thread.description}
        </div>
      </article>

      {/* Responses */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-text">
          Replies ({(posts ?? []).length})
        </h3>

        {(posts ?? []).length === 0 ? (
          <div className="rounded-xl border border-line bg-page p-6 text-center text-xs text-slate-text">
            No replies yet. Be the first to join this academic discussion!
          </div>
        ) : (
          (posts ?? []).map((post, idx) => {
            const author = nameMap.get(post.author_id) || (post.author_id === user.id ? "You" : "Academy Member");
            const isTutor = post.author_role === "tutor" || post.author_role === "teacher" || post.author_role === "admin";
            return (
              <article key={post.id} className="student-card space-y-3 p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs ${
                      isTutor ? "bg-[#0b3644] text-mint" : "bg-mint/10 text-[#0aa178]"
                    }`}>
                      {author.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-ink">{author}</strong>
                        {isTutor && (
                          <span className="rounded bg-[#0b3644] px-1.5 py-0.5 text-[9px] font-black uppercase text-mint">
                            Verified Tutor
                          </span>
                        )}
                        {post.author_id === user.id && !isTutor && (
                          <span className="rounded bg-mint/10 px-1.5 py-0.5 text-[9px] font-bold text-[#0aa178]">
                            You
                          </span>
                        )}
                      </div>
                      <small className="text-[10px] text-slate-text">
                        {new Date(post.created_at).toLocaleString("en-LK")}
                      </small>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-text">#{idx + 1}</span>
                </div>

                <div className="whitespace-pre-wrap text-xs leading-6 text-ink">
                  {post.content}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Reply input */}
      {thread.status === "active" ? (
        <ThreadReplyBox threadId={thread.id} />
      ) : (
        <div className="rounded-xl border border-line bg-page p-4 text-center text-xs text-slate-text">
          This discussion topic is closed to new replies.
        </div>
      )}
    </div>
  );
}
