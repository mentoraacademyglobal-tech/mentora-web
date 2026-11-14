export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-line" />
      <div className="mt-6 h-40 rounded-2xl bg-card" />
      <div className="mt-4 h-40 rounded-2xl bg-card" />
    </div>
  );
}
