// A message at the top of a page. Errors are announced at once, notices politely.
export default function Banner({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl bg-success-soft px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      ) : null}
    </>
  );
}
