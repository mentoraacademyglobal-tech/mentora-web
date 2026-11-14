"use client";

import { useFormStatus } from "react-dom";

// A submit button that disables itself while the form is working, so a slow tap cannot be sent twice.
export default function SubmitButton({
  children,
  pendingText = "Working",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
