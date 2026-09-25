"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteSaleAction } from "@/app/dashboard/actions/till";
import type { ActionState } from "@/lib/validation";

/**
 * The day's lines.
 *
 * Online bookings appear alongside the till entries, because the question the
 * provider is asking is "what came in today", not "what did I type in today".
 * They are marked as coming from the booking form and cannot be edited here:
 * an appointment has a state machine behind it, and a till line does not.
 */

export type Row = {
  id: string;
  label: string;
  amountLabel: string;
  methodLabel: string | null;
  customerName: string | null;
  note: string | null;
  timeLabel: string;
  source: "till" | "booking";
  href?: string;
};

const IDLE: ActionState = { status: "idle" };

export function TillList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p style={{ margin: 0, color: "var(--admin-muted)", fontSize: ".9rem" }}>
        Rien pour cette journée. Enregistrez un encaissement ci-dessus.
      </p>
    );
  }

  return (
    <ul className="till-rows">
      {rows.map((row) => (
        <li key={`${row.source}-${row.id}`}>
          <div className="till-row">
            <span className="till-time">{row.timeLabel}</span>

            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: "block", fontWeight: 600 }}>
                {row.href ? (
                  <Link href={row.href}>{row.label}</Link>
                ) : (
                  row.label
                )}
                {row.source === "booking" ? (
                  <span className="pill pill-neutral till-tag">en ligne</span>
                ) : null}
              </span>
              <span className="till-meta">
                {[row.customerName, row.methodLabel, row.note]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </span>
            </span>

            <span className="till-amount">{row.amountLabel}</span>

            {row.source === "till" ? <DeleteButton saleId={row.id} /> : null}
          </div>
        </li>
      ))}

      <style>{`
        .till-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: .15rem; }
        .till-row {
          display: flex;
          gap: .75rem;
          align-items: center;
          padding: .55rem .4rem;
          margin: 0 -.4rem;
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .till-row:hover { background: var(--admin-subtle); }
        .till-time {
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
          min-width: 44px;
        }
        .till-tag { margin-left: .45rem; font-size: .68rem; vertical-align: middle; }
        .till-meta {
          display: block;
          margin-top: .15rem;
          font-size: .82rem;
          color: var(--admin-muted);
        }
        .till-amount {
          font-weight: 700;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </ul>
  );
}

function DeleteButton({ saleId }: { saleId: string }) {
  const [state, action, pending] = useActionState(deleteSaleAction, IDLE);

  return (
    <form action={action}>
      <input type="hidden" name="saleId" value={saleId} />
      <button
        type="submit"
        className="btn btn-ghost"
        disabled={pending}
        aria-label="Supprimer cette ligne"
        onClick={(event) => {
          if (!window.confirm("Supprimer cette ligne de caisse ?")) {
            event.preventDefault();
          }
        }}
        style={{ padding: ".25rem .5rem", minHeight: 32, fontSize: ".8rem" }}
      >
        {pending ? "…" : "✕"}
      </button>

      {state.status === "error" ? (
        <span style={{ fontSize: ".78rem", color: "var(--tone-danger-fg)" }}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
