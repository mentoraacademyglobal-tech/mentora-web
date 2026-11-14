export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 rounded-lg bg-line" />
      <div className="mt-6 h-32 rounded-[20px] bg-card" />
    </div>
  );
}
