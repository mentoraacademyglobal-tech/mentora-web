export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-32 rounded-lg bg-line" />
      <div className="mt-6 h-28 rounded-2xl bg-deep/90" />
      <div className="mt-6 h-32 rounded-2xl bg-card" />
    </div>
  );
}
