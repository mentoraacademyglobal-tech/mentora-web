import { requireUser } from "@/lib/auth";
import { getProfileName } from "@/features/identity";
import AppShell from "./AppShell";

/** Student deployment has one shell. Staff use manager.mentora.lk. */
export default async function ShellLoader({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const name = (await getProfileName(supabase, user.id)) || user.email?.split("@")[0] || "Student";
  return <AppShell portal="student" name={name} roleLabel="Student" dateLabel="">{children}</AppShell>;
}
