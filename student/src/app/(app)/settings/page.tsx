import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import Banner from "@/components/ui/Banner";
import SubmitButton from "@/components/ui/SubmitButton";
import { PageHeader, Metric } from "@/components/ui/StudentUI";
import Icon from "@/components/layout/Icon";
import { field, labelClass } from "@/components/ui/styles";
import { one } from "@/lib/relations";
import { ROLE_LABEL, getProfileName, listMyMemberships, updateProfile } from "@/features/identity";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const { supabase, user } = await requireUser();
  const [name, memberships] = await Promise.all([
    getProfileName(supabase, user.id),
    listMyMemberships(supabase),
  ]);

  const primaryRoleLabel = "Student";
  const studentMemberships = memberships.filter(m => m.role === "student");
  const orgName = one(studentMemberships[0]?.organisations ?? null)?.name ?? "Mentora Academy";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="ACCOUNT / SETTINGS" title="Account Settings" subtitle="Manage your student details, academy information and account recovery." />

      <Banner error={error} notice={notice} />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Metric label="Session" value="Active" detail="Signed in" icon="check" />
        <Metric label="Account" value={primaryRoleLabel} detail="Student access" icon="users" />
        <Metric label="Academy" value={orgName} detail="Registered institution" icon="school" />
        <Metric label="Recovery" value="Email" detail="Password reset" icon="mail" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Details Card */}
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-deep text-base font-bold text-mint">
              {(name || user.email || "M").charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Personal Profile</h2>
              <p className="text-xs text-slate-text">Your name as shown on class registers and transcripts.</p>
            </div>
          </div>

          <form action={updateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className={labelClass}>
                Full Name *
              </label>
              <input
                id="full_name"
                name="full_name"
                defaultValue={name ?? ""}
                required
                maxLength={100}
                autoComplete="name"
                className={field}
              />
              <p className="text-[11px] text-slate-text">Visible to teachers, administrators, and peers.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Email Address</span>
              <div className="rounded-xl border border-line bg-page px-3.5 py-2.5 text-sm text-slate-text font-mono">
                {user.email}
              </div>
              <p className="text-[11px] text-slate-text">Managed by academy administration.</p>
            </div>

            <div className="pt-2 flex justify-end">
              <SubmitButton className="student-action student-action-primary" pendingText="Saving changes...">
                Save Profile Changes
              </SubmitButton>
            </div>
          </form>
        </section>

        {/* Institutional Memberships & Security */}
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-line pb-4 mb-4">
              <Icon name="school" className="h-4 w-4 text-[#0b9974]" />
              <div>
                <h2 className="text-base font-bold text-ink">Institutional Affiliations</h2>
                <p className="text-xs text-slate-text">Your student academy memberships.</p>
              </div>
            </div>

            {studentMemberships.length === 0 ? (
              <p className="text-sm text-slate-text py-2">
                No active academy memberships. Use an invite code on registration to join.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {studentMemberships.map((m, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-line bg-page p-3"
                  >
                    <div>
                      <p className="font-semibold text-sm text-ink capitalize">
                        {ROLE_LABEL[m.role] ?? m.role}
                      </p>
                      <p className="text-xs text-slate-text">
                        {one(m.organisations)?.name ?? "Mentora International Academy"}
                      </p>
                    </div>
                    <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-[10px] font-bold text-deep uppercase">
                      Active
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-line pb-4 mb-4">
              <Icon name="cog" className="h-4 w-4 text-azure" />
              <div>
                <h2 className="text-base font-bold text-ink">Account Security & Credentials</h2>
                <p className="text-xs text-slate-text">Manage password and authentication security.</p>
              </div>
            </div>

            <p className="text-xs text-slate-text leading-relaxed">
              To update your account password or rotate security credentials, generate an encrypted password reset email.
            </p>

            <div className="mt-4 flex justify-start">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-page px-4 py-2 text-xs font-bold text-ink hover:border-mint transition-colors"
              >
                Change Account Password →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
