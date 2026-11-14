"use client";

import { useActionState } from "react";
import { updatePassword, type ResetState } from "../actions";
import Banner from "@/components/ui/Banner";
import SubmitButton from "@/components/ui/SubmitButton";
import { field, labelClass, primaryButton } from "@/components/ui/styles";

export default function ResetForm() {
  const [state, action] = useActionState<ResetState, FormData>(updatePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={field} />
        <p className="text-xs text-slate-text">At least 8 characters.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm" className={labelClass}>
          Type it again
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={field} />
      </div>
      <Banner error={state?.error} />
      <SubmitButton className={primaryButton} pendingText="Saving">
        Change password
      </SubmitButton>
    </form>
  );
}
