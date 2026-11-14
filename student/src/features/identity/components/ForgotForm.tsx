"use client";

import { useActionState } from "react";
import { requestReset, type ForgotState } from "../actions";
import Banner from "@/components/ui/Banner";
import SubmitButton from "@/components/ui/SubmitButton";
import { field, labelClass, primaryButton } from "@/components/ui/styles";

export default function ForgotForm() {
  const [state, action] = useActionState<ForgotState, FormData>(requestReset, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={field} />
      </div>
      <Banner error={state?.error} notice={state?.notice} />
      <SubmitButton className={primaryButton} pendingText="Sending">
        Send reset link
      </SubmitButton>
    </form>
  );
}
