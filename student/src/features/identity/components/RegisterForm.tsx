"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { register, type RegisterState } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { field, labelClass, primaryButton } from "@/components/ui/styles";

const DISTRICTS = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];
const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Grade 13", "GCE O/L", "GCE A/L", "Other"];
const input = `${field} !h-12 !text-sm`;

export default function RegisterForm() {
  const [state, action] = useActionState<RegisterState, FormData>(register, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const maxDob = useSyncExternalStore(() => () => {}, () => new Date().toISOString().slice(0,10), () => undefined);

  return (
    <form action={action} className="space-y-6" noValidate={false}>
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
        <Field name="first_name" label="First name" placeholder="First name" required autoComplete="given-name" />
        <Field name="last_name" label="Last name" placeholder="Last name" required autoComplete="family-name" />
        <Field name="date_of_birth" label="Date of birth" type="date" required max={maxDob} />
        <Select name="gender" label="Gender" options={["Male", "Female", "Other", "Prefer not to say"]} />
        <Select name="district" label="District" options={DISTRICTS} required />
        <Select name="grade" label="Grade" options={GRADES} required />
        <Select name="medium" label="Medium of instruction" options={["English", "Sinhala", "Tamil"]} required />
        <Field name="school" label="School" placeholder="Name of school" required maxLength={150} />
        <Field name="phone" label="WhatsApp / mobile number" placeholder="+94 7X XXX XXXX" type="tel" autoComplete="tel" required maxLength={32} />
        <Field name="guardian_phone" label="Parent / guardian mobile number" placeholder="+94 7X XXX XXXX" type="tel" required maxLength={32} />
        <Field name="email" label="Email address" placeholder="you@example.com" type="email" required autoComplete="email" maxLength={254} />
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className={labelClass}>Password <span aria-hidden="true">*</span></label>
          <div className="relative"><input id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" className={`${input} pr-16`}/>
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-text underline" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
          <p className="text-xs text-slate-text">Use at least 8 characters.</p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm_password" className={labelClass}>Confirm password <span aria-hidden="true">*</span></label>
          <input id="confirm_password" name="confirm_password" type={showPassword ? "text" : "password"} required minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" className={input} />
          {confirm && confirm !== password && <span className="text-xs text-danger">Passwords do not match.</span>}
        </div>
        <Select name="referral" label="How did you hear about Mentora?" options={["Friend / family", "School", "Teacher", "Social media", "Google / Search", "Other"]} />
        <div className="flex flex-col gap-2">
          <label htmlFor="address" className={labelClass}>Residential address <span aria-hidden="true">*</span></label>
          <textarea id="address" name="address" maxLength={500} required rows={3} className="w-full rounded-xl border border-line bg-page p-3 text-sm text-ink outline-none focus:ring-2 focus:ring-mint" placeholder="Street address, city" />
        </div>
      </div>
      <div className="rounded-xl border border-line bg-page p-4 text-xs leading-5 text-slate-text">
        <strong className="mb-1 block text-sm text-ink">Registration is free</strong>
        Your account is created immediately, subject to email confirmation. You can join a class only when an administrator enrolls you or you redeem a valid class invitation code after signing in.
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-text">
        <input name="consent" type="checkbox" value="yes" required checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-[#19e69a]" />
        <span>I confirm the information is accurate and agree to Mentora&apos;s applicable terms and privacy notice. If I am under the age required to consent, my parent/guardian has approved registration.</span>
      </label>
      {state?.error && <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm text-danger">{state.error}</p>}
      {state?.notice && <p role="status" className="rounded-xl bg-success-soft p-4 text-sm text-ink">{state.notice}</p>}
      <SubmitButton className={`${primaryButton} !h-12 !w-full sm:!w-auto sm:min-w-48`} pendingText="Creating your accountâ€¦">Create my account â†’</SubmitButton>
    </form>
  );
}

function Field({name,label,type="text",required=false,placeholder,autoComplete,maxLength,max}:{name:string;label:string;type?:string;required?:boolean;placeholder?:string;autoComplete?:string;maxLength?:number;max?:string}) {
 return <div className="flex flex-col gap-2"><label htmlFor={name} className={labelClass}>{label} {required && <span aria-hidden="true">*</span>}</label><input id={name} name={name} type={type} required={required} max={max} maxLength={maxLength} autoComplete={autoComplete} placeholder={placeholder} className={input}/></div>;
}
function Select({name,label,options,required=false}:{name:string;label:string;options:string[];required?:boolean}) {
 return <div className="flex flex-col gap-2"><label htmlFor={name} className={labelClass}>{label} {required && <span aria-hidden="true">*</span>}</label><select id={name} name={name} required={required} defaultValue="" className={input}><option value="">Select {label.toLowerCase()}</option>{options.map(item=><option key={item} value={item}>{item}</option>)}</select></div>;
}
