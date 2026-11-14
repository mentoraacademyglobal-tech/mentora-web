export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-2xl" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-32 rounded-lg bg-line" />
      <div className="mt-6 h-48 rounded-[20px] bg-card" />
    </div>
  );
}
