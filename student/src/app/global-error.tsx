"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F5F7FA", color: "#062A35", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div role="alert" style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "#fff", padding: 40, borderRadius: 28, boxShadow: "0 4px 32px rgba(0,0,0,0.08)" }}>
            {/* Warning icon */}
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "#fdecec", marginBottom: 16 }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#8a1f1f" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#4a6470", lineHeight: 1.6 }}>
              That did not work, and it was not your fault. Try again — it usually clears up on its own.
              If it keeps happening, tell your academy what you were doing.
            </p>
            {error.digest && (
              <p style={{ margin: "0 0 20px", fontSize: 12, fontFamily: "monospace", background: "#eaf0f4", padding: "8px 12px", borderRadius: 8, color: "#4a6470" }}>
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={reset}
                style={{ height: 48, padding: "0 24px", border: 0, borderRadius: 12, background: "#19E69A", color: "#062A35", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                style={{ display: "inline-flex", alignItems: "center", height: 48, padding: "0 20px", border: "1.5px solid #062A35", borderRadius: 12, background: "#fff", color: "#062A35", fontWeight: 500, fontSize: 14, textDecoration: "none" }}
              >
                Go to dashboard
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
