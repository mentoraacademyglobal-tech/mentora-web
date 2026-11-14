"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "../actions";

const field =
  "h-12 w-full rounded-xl border border-field bg-card px-4 text-base text-ink placeholder:text-slate-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, undefined);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className={field}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm underline underline-offset-4">
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="h-12 rounded-xl bg-mint text-base font-bold text-deep transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure disabled:opacity-60"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
