import { one } from "@/lib/relations";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMyClassIds } from "@/features/classes";
import { PageHeader, Metric, Surface, BlankState } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
import NewThreadModal from "@/components/forum/NewThreadModal";

export const metadata: Metadata = { title: "Class Discussions" };

export default async function ForumPage() {
  const { supabase, user } = await requireUser();
  const mine = await getMyClassIds(supabase, user.id);
  const { data: member } = await supabase
    .from("memberships")
    .select("organisation_id")
    .eq("user_id", user.id)
    .eq("role", "student")
    .limit(1)
    .maybeSingle();

  // Fetch enrolled class names
  const enrolledClassIds = Array.from(mine.enrolled);
  const { data: enrolledClasses } = enrolledClassIds.length
    ? await supabase.from("classes").select("id, name").in("id", enrolledClassIds)
    : { data: [] };

  const { data, error } = member
    ? await supabase
        .from("mm_forum_threads")
        .select(`
          id, name, description, course_id, created_at,
          classes ( name )
        `)
        .eq("organisation_id", member.organisation_id)
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };

  const threads = (data ?? []).filter(t => !t.course_id || mine.enrolled.has(t.course_id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            eyebrow="COMMUNITY / DISCUSSIONS"
            title="Class Discussions"
            subtitle="Academic discussion topics shared across your academy and enrolled classes."
          />
        </div>
        <div className="self-start sm:self-auto">
          <NewThreadModal classes={(enrolledClasses ?? []) as { id: string; name: string }[]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Available topics" value={error ? "—" : threads.length} icon="chat" detail="Academy & class threads" />
        <Metric label="My classes" value={mine.enrolled.size} icon="book" detail="Enrolled subjects" />
        <Metric label="Forum visibility" value="Class-scoped" icon="check" detail="Safe peer discussion" />
        <Metric label="Participation" value="Active" icon="users" detail="Create & reply" />
      </div>

      <Surface title="Discussion topics" description="Class questions, exam discussions and peer collaboration">
        {error ? (
          <BlankState
            icon="chat"
            title="Discussions not configured"
            description="Enable the Manager discussion module and its student read policy."
          />
        ) : threads.length ? (
          <div className="space-y-3">
            {threads.map(thread => {
              const clsName = one(thread.classes)?.name;
              return (
                <article
                  key={thread.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-page p-4 transition-colors hover:border-mint/50 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-[#0a9c78]">
                      <Icon name="chat" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-extrabold text-ink">{thread.name}</h2>
                      <p className="mt-1 text-[11px] text-slate-text">
                        {new Date(thread.created_at).toLocaleDateString("en-LK")} · {clsName ? `Class: ${clsName}` : "Academy discussion"}
                      </p>
                      {thread.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-text">
                          {thread.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/forum/${thread.id}`}
                    className="student-action student-action-secondary shrink-0 self-start sm:self-center"
                  >
                    View Topic <Icon name="arrow-right" className="h-3 w-3" />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <BlankState
            icon="chat"
            title="No discussion topics yet"
            description="Start the conversation! Click 'Start Discussion' to post an academic question."
          />
        )}
      </Surface>

      <p className="text-xs text-slate-text">
        Discussions are moderated by academy staff and tutors. Please adhere to Mentora academic conduct guidelines.
      </p>
    </div>
  );
}
