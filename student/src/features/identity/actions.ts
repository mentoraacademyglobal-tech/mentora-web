"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext, withParam } from "@/lib/redirect";
import { siteUrl } from "@/lib/site";
import { redeemInvite, redeemPendingInvite } from "./invites";

export type SignInState = { error?: string } | undefined;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawNext = String(formData.get("next") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password do not match. Check them and try again." };
  }

  await redeemPendingInvite(supabase, data.user);
  const {error: staffInviteError} = await supabase.rpc('mm_accept_staff_invitations');
  if (staffInviteError) return {error: 'Account setup is temporarily unavailable. Please contact the academy.'};
  const {data: access, error: accessError} = await supabase.rpc('mm_portal_access');
  if (accessError || access?.blocked) redirect('/account-access');

  // Student deployment: keep local redirects, never route into a removed admin portal.
  // Manager has a separate authorized login at manager.mentora.lk.
  const requested = safeNext(rawNext, "/dashboard");
  const target = requested.startsWith("/admin") || requested.startsWith("/students") || requested.startsWith("/marking")
    ? "/dashboard" : requested;
  redirect(target);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type RegisterState = { error?: string; notice?: string } | undefined;

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  const firstName = value("first_name");
  const lastName = value("last_name");
  const email = value("email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  const dob = value("date_of_birth");
  const district = value("district");
  const grade = value("grade");
  const medium = value("medium");
  const school = value("school");
  const phone = value("phone");
  const guardianPhone = value("guardian_phone");
  const address = value("address");
  const gender = value("gender");
  const referral = value("referral");
  const districts = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];
  const grades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Grade 13", "GCE O/L", "GCE A/L", "Other"];
  const mediums = ["English", "Sinhala", "Tamil"];
  if (formData.get("consent") !== "yes") return { error: "Please read and accept the registration terms." };
  if (!firstName || !lastName || !dob || !school || !phone || !guardianPhone || !address || !email) return { error: "Please complete all required student details." };
  if (firstName.length > 80 || lastName.length > 80 || school.length > 150 || address.length > 500 || phone.length > 32 || guardianPhone.length > 32) return { error: "One or more fields are too long." };
  if (!districts.includes(district) || !grades.includes(grade) || !mediums.includes(medium)) return { error: "Choose valid district, grade and medium values." };
  if (gender && !["Male","Female","Other","Prefer not to say"].includes(gender)) return { error: "Choose a valid gender option." };
  if (referral && !["Friend / family","School","Teacher","Social media","Google / Search","Other"].includes(referral)) return { error: "Choose a valid referral method." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(`${dob}T00:00:00Z`)) || dob > new Date().toISOString().slice(0,10)) return { error: "Enter a valid date of birth." };
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "Enter a valid email address." };
  if (!/^[+()\d\s-]{7,32}$/.test(phone) || !/^[+()\d\s-]{7,32}$/.test(guardianPhone)) return { error: "Enter valid contact numbers (7–32 characters)." };
  if (password.length < 8 || password.length > 128) return { error: "Use a password of 8–128 characters." };
  if (password !== confirm) return { error: "The passwords do not match." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        registration_source: 'student_portal',
        full_name: `${firstName} ${lastName}`,
        first_name: firstName, last_name: lastName, date_of_birth: dob, gender,
        district, grade, medium, school, phone, guardian_phone: guardianPhone,
        address, referral,
        // The DB trigger always creates a STUDENT membership. Client metadata cannot grant privileges.
      },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
    },
  });
  if (error) return { error: "Registration could not be completed. Check your information or contact Mentora support." };
  if (!data.session) return { notice: "Registration submitted. If your email requires confirmation, check your inbox, then sign in. Your classes will appear once you are enrolled." };
  redirect("/dashboard");
}

export type ForgotState = { error?: string; notice?: string } | undefined;

export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const redirectTo = `${await siteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // The same answer whether or not the email has an account, so nobody can use this to find out who is registered.
  return { notice: "If that email has an account, we have sent a link to choose a new password. Check your inbox." };
}

export type ResetState = { error?: string } | undefined;

export async function updatePassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Use a password with at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "We could not change your password. The link may have expired, so ask for a new one." };
  }

  redirect(withParam("/dashboard", "notice", "Your password has been changed."));
}

export type JoinState = { error?: string } | undefined;

export async function joinWithCode(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const supabase = await createClient();
  const result = await redeemInvite(supabase, String(formData.get("code") ?? ""));
  if (result.error) return result;
  redirect("/dashboard");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 1 || fullName.length > 100) {
    redirect(withParam("/settings", "error", "Enter your name, up to 100 characters."));
  }

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) redirect(withParam("/settings", "error", "Your name could not be saved. Try again."));

  redirect(withParam("/settings", "notice", "Your name has been saved."));
}
