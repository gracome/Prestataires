import type { Breakdown, DailyPoint, Delta } from "@/lib/reports/metrics";

/**
 * Presentation of a report.
 *
 * Every figure carries its comparison with the previous period, because a
 * number alone tells a provider nothing: 12 bookings is good or bad only
 * against the 8 or the 20 that came before.
 */

export type KpiTone = "neutral" | "good-up" | "good-down";

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  deltaUnit = "auto",
  tone = "good-up",
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: Delta;
  /** What the delta is measured in, when it is not a percentage. */
  deltaLabel?: string;
  /**
   * A figure that is itself a percentage moves in points, never in percent: a
   * cancellation rate falling from 11 % to 4 % is seven points, and calling it
   * "−64 %" invites the provider to read it as her rate.
   */
  deltaUnit?: "auto" | "points";
  tone?: KpiTone;
}) {
  return (
    <div className="card" style={{ height: "100%" }}>
      <p
        style={{
          margin: 0,
          fontSize: ".75rem",
          textTransform: "uppercase",
          letterSpacing: ".07em",
          color: "var(--admin-muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </p>

      <p style={{ margin: ".4rem 0 0", fontSize: "1.6rem", fontWeight: 700, lineHeight: 1.15 }}>
        {value}
      </p>

      {delta ? (
        <DeltaBadge delta={delta} label={deltaLabel} unit={deltaUnit} tone={tone} />
      ) : null}

      {hint ? (
        <p style={{ margin: ".4rem 0 0", fontSize: ".8rem", color: "var(--admin-muted)", lineHeight: 1.5 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function DeltaBadge({
  delta,
  label,
  unit,
  tone,
}: {
  delta: Delta;
  label?: string;
  unit: "auto" | "points";
  tone: KpiTone;
}) {
  if (delta.direction === "flat") {
    return (
      <p style={{ margin: ".35rem 0 0", fontSize: ".82rem", color: "var(--admin-muted)" }}>
        Identique à la période précédente
      </p>
    );
  }

  // For a rate like cancellations, going down is the good outcome.
  const good =
    tone === "neutral"
      ? null
      : tone === "good-up"
        ? delta.direction === "up"
        : delta.direction === "down";

  const color =
    good === null
      ? "var(--admin-muted)"
      : good
        ? "var(--tone-success-fg)"
        : "var(--tone-danger-fg)";

  const arrow = delta.direction === "up" ? "▲" : "▼";

  const size =
    unit === "points"
      ? `${Math.abs(delta.change)} point${Math.abs(delta.change) > 1 ? "s" : ""}`
      : delta.ratio !== null
        ? `${Math.abs(Math.round(delta.ratio * 100))} %`
        : `${Math.abs(delta.change)}${label ? ` ${label}` : ""}`;

  return (
    <p style={{ margin: ".35rem 0 0", fontSize: ".82rem", color, fontWeight: 600 }}>
      <span aria-hidden="true">{arrow} </span>
      {size}
      <span style={{ fontWeight: 400, color: "var(--admin-muted)" }}>
        {" "}
        {unit === "points" || delta.ratio !== null
          ? "vs période précédente"
          : `vs ${delta.previous} sur la période précédente`}
      </span>
    </p>
  );
}

/**
 * A plain CSS bar chart. No charting library: a dozen bars with a readable
 * label is all a provider needs, and it keeps the page weightless.
 */
export function RevenueChart({
  points,
  formatAmount,
  formatDate,
  /** Off when the chart already sits inside a card, so it is not framed twice. */
  framed = true,
  height = 160,
  /** Which figure the bars stand for. Money by default, bookings elsewhere. */
  measure = "revenue",
  measureLabel = "Chiffre d'affaires",
}: {
  points: DailyPoint[];
  formatAmount: (value: number) => string;
  formatDate: (date: string) => string;
  framed?: boolean;
  height?: number;
  measure?: "revenue" | "count";
  measureLabel?: string;
}) {
  const valueOf = (point: DailyPoint) =>
    measure === "count" ? point.count : point.revenue;
  const peak = Math.max(1, ...points.map(valueOf));
  // Beyond a few weeks the daily bars become unreadable, so only some labels
  // are printed.
  const labelEvery = Math.ceil(points.length / 12);

  return (
    <div className={framed ? "card" : undefined}>
      <div
        role="img"
        aria-label={`${measureLabel} par jour, maximum ${formatAmount(peak)}`}
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: points.length > 40 ? 1 : 3,
          height,
          marginBottom: ".6rem",
        }}
      >
        {points.map((point) => (
          <div
            key={point.date}
            title={`${formatDate(point.date)} — ${formatAmount(valueOf(point))}`}
            style={{
              flex: 1,
              minWidth: 2,
              height: `${Math.max(2, (valueOf(point) / peak) * 100)}%`,
              borderRadius: "3px 3px 0 0",
              background:
                valueOf(point) > 0 ? "var(--admin-accent)" : "var(--admin-subtle)",
              opacity: valueOf(point) > 0 ? 1 : 0.7,
            }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        style={{
          display: "flex",
          gap: points.length > 40 ? 1 : 3,
          fontSize: ".68rem",
          color: "var(--admin-muted)",
        }}
      >
        {points.map((point, index) => (
          <span
            key={point.date}
            style={{
              flex: 1,
              minWidth: 2,
              textAlign: "center",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {index % labelEvery === 0 ? point.date.slice(8, 10) : ""}
          </span>
        ))}
      </div>

      <p style={{ margin: ".6rem 0 0", fontSize: ".8rem", color: "var(--admin-muted)" }}>
        {framed
          ? `${measureLabel}, jour par jour. Le plus haut de la période atteint ${formatAmount(peak)}.`
          : `Meilleure journée : ${formatAmount(peak)}.`}
      </p>
    </div>
  );
}

/**
 * The same ranking as the table, narrow enough for a dashboard column.
 *
 * A table with four columns does not survive being squeezed next to an agenda,
 * so here each prestation is one row: name and revenue on top, the share as a
 * bar underneath.
 */
export function MiniBreakdown({
  rows,
  formatAmount,
  emptyLabel,
  limit = 5,
}: {
  rows: Breakdown[];
  formatAmount: (minor: number) => string;
  emptyLabel: string;
  limit?: number;
}) {
  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--admin-muted)", fontSize: ".88rem" }}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".7rem" }}>
      {rows.slice(0, limit).map((row) => (
        <li key={row.key}>
          <div
            style={{
              display: "flex",
              gap: ".75rem",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: ".9rem",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: ".88rem",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatAmount(row.revenue)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              marginTop: ".3rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                background: "var(--admin-subtle)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${Math.round(row.share * 100)}%`,
                  height: "100%",
                  background: "var(--admin-accent)",
                }}
              />
            </span>
            <span
              style={{
                fontSize: ".76rem",
                color: "var(--admin-muted)",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.count} rdv · {Math.round(row.share * 100)} %
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BreakdownTable({
  rows,
  formatAmount,
  emptyLabel,
  firstColumn,
}: {
  rows: Breakdown[];
  formatAmount: (minor: number) => string;
  emptyLabel: string;
  firstColumn: string;
}) {
  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--admin-muted)", fontSize: ".9rem" }}>{emptyLabel}</p>
    );
  }

  return (
    <div className="card table-scroll" style={{ padding: 0 }}>
      <table className="data">
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col">Rendez-vous</th>
            <th scope="col">Chiffre d&apos;affaires</th>
            <th scope="col">Part</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td style={{ fontWeight: 600 }}>{row.label}</td>
              <td>{row.count}</td>
              <td style={{ whiteSpace: "nowrap" }}>{formatAmount(row.revenue)}</td>
              <td style={{ minWidth: 120 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--admin-subtle)",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        width: `${Math.round(row.share * 100)}%`,
                        height: "100%",
                        background: "var(--admin-accent)",
                      }}
                    />
                  </span>
                  {Math.round(row.share * 100)} %
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
