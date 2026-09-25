/**
 * Shown the instant a dashboard link is clicked.
 *
 * Every dashboard page is dynamic and runs several queries, so there is always
 * a gap between the click and the new screen. Without this the page simply did
 * not change and the provider clicked again, sometimes three or four times.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Chargement de la page…</span>

      <div style={{ marginBottom: "1.5rem" }}>
        <Bar width="42%" height={26} />
        <div style={{ height: ".6rem" }} />
        <Bar width="68%" height={14} />
      </div>

      <div
        style={{
          display: "grid",
          gap: ".75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          marginBottom: "2rem",
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="card">
            <Bar width="55%" height={11} />
            <div style={{ height: ".7rem" }} />
            <Bar width="35%" height={24} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: ".6rem" }}>
        {[0, 1, 2].map((index) => (
          <div key={index} className="card">
            <Bar width="30%" height={14} />
            <div style={{ height: ".5rem" }} />
            <Bar width="60%" height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A placeholder block that breathes, so the screen reads as busy. */
function Bar({ width, height }: { width: string; height: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: 6,
        background: "var(--admin-subtle)",
        animation: "admin-pulse 1.4s ease-in-out infinite",
      }}
    />
  );
}
