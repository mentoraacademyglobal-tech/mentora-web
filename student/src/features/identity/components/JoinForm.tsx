"use client";

import { useActionState } from "react";
import { joinWithCode, type JoinState } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { field, labelClass, primaryButton } from "@/components/ui/styles";

export default function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action] = useActionState<JoinState, FormData>(joinWithCode, undefined);

  return (
    <form action={action} className="mt-4 flex max-w-sm flex-col gap-3">
      <label htmlFor="join-code" className={labelClass}>
        Invite code
      </label>
      <input
        id="join-code"
        name="code"
        defaultValue={initialCode}
        required
        autoComplete="off"
        placeholder="XXXXX-XXXXX"
        className={`${field} uppercase tracking-wider`}
      />
      {state?.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton className={primaryButton} pendingText="Checking">
        Join academy
      </SubmitButton>
    </form>
  );
}
