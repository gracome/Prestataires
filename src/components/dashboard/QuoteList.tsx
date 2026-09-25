"use client";

import { useState, useTransition } from "react";
import type { QuoteRequestStatus } from "@prisma/client";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deleteQuoteAction,
  setQuoteStatusAction,
} from "@/app/dashboard/actions/quotes";
import { Feedback } from "./SettingsForms";

export type QuoteRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string | null;
  description: string;
  budgetLabel: string | null;
  preferredDateLabel: string | null;
  receivedLabel: string;
  status: QuoteRequestStatus;
  attachmentUrl: string | null;
  whatsappUrl: string | null;
  /** The range the customer was shown, when the estimator was on. */
  estimateLabel: string | null;
  estimateDurationLabel: string | null;
  estimateAnswers: Array<{ question: string; choice: string }>;
};

const STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  NEW: "Nouvelle",
  IN_PROGRESS: "En cours",
  ANSWERED: "Répondu",
  CLOSED: "Clôturée",
};

const STATUS_TONES: Record<QuoteRequestStatus, string> = {
  NEW: "action",
  IN_PROGRESS: "pending",
  ANSWERED: "success",
  CLOSED: "neutral",
};

export function QuoteList({ quotes }: { quotes: QuoteRow[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  return (
    <div>
      <Feedback state={feedback} />

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".75rem" }}>
        {quotes.map((quote) => (
          <li key={quote.id} className="card">
            <div
              style={{
                display: "flex",
                gap: ".75rem",
                justifyContent: "space-between",
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{quote.customerName}</p>
                <p style={{ margin: ".2rem 0 0", fontSize: ".84rem", color: "var(--admin-muted)" }}>
                  Reçue le {quote.receivedLabel}
                  {quote.serviceName ? ` · ${quote.serviceName}` : ""}
                </p>
              </div>
              <span className={`pill pill-${STATUS_TONES[quote.status]}`}>
                {STATUS_LABELS[quote.status]}
              </span>
            </div>

            {quote.estimateLabel ? (
              <div
                style={{
                  margin: ".9rem 0 0",
                  padding: ".85rem 1rem",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--admin-accent) 12%, transparent)",
                }}
              >
                <p style={{ margin: 0, fontSize: ".75rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--admin-muted)", fontWeight: 600 }}>
                  Estimation affichée à la cliente
                </p>
                <p style={{ margin: ".2rem 0 0", fontWeight: 700, fontSize: "1.05rem" }}>
                  {quote.estimateLabel}
                  {quote.estimateDurationLabel ? (
                    <span style={{ fontWeight: 400, color: "var(--admin-muted)", fontSize: ".88rem" }}>
                      {" "}· environ {quote.estimateDurationLabel}
                    </span>
                  ) : null}
                </p>
                {quote.estimateAnswers.length > 0 ? (
                  <ul style={{ margin: ".6rem 0 0", paddingLeft: "1.1rem", fontSize: ".85rem", lineHeight: 1.6, color: "var(--admin-muted)" }}>
                    {quote.estimateAnswers.map((line, index) => (
                      <li key={index}>
                        {line.question} : <strong style={{ color: "var(--admin-text)", fontWeight: 600 }}>{line.choice}</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <p
              style={{
                margin: ".9rem 0 0",
                lineHeight: 1.65,
                fontSize: ".92rem",
                whiteSpace: "pre-line",
              }}
            >
              {quote.description}
            </p>

            <dl
              style={{
                margin: "1rem 0 0",
                display: "grid",
                gap: ".3rem",
                fontSize: ".88rem",
              }}
            >
              <Row label="Téléphone" value={quote.customerPhone} href={`tel:${quote.customerPhone.replace(/[^0-9+]/g, "")}`} />
              {quote.customerEmail ? (
                <Row label="Email" value={quote.customerEmail} href={`mailto:${quote.customerEmail}`} />
              ) : null}
              {quote.budgetLabel ? <Row label="Budget" value={quote.budgetLabel} /> : null}
              {quote.preferredDateLabel ? (
                <Row label="Date souhaitée" value={quote.preferredDateLabel} />
              ) : null}
            </dl>

            {quote.attachmentUrl ? (
              <a href={quote.attachmentUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={quote.attachmentUrl}
                  alt={`Photo jointe par ${quote.customerName}`}
                  style={{
                    marginTop: ".9rem",
                    maxWidth: "100%",
                    maxHeight: 260,
                    borderRadius: 10,
                    border: "1px solid var(--admin-border)",
                    display: "block",
                  }}
                />
              </a>
            ) : null}

            <div
              style={{
                display: "flex",
                gap: ".5rem",
                flexWrap: "wrap",
                marginTop: "1.1rem",
                paddingTop: ".9rem",
                borderTop: "1px solid var(--admin-border)",
              }}
            >
              {quote.whatsappUrl ? (
                <a
                  href={quote.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={smallButton}
                >
                  Répondre sur WhatsApp
                </a>
              ) : null}

              <label className="visually-hidden" htmlFor={`status-${quote.id}`}>
                Statut de la demande
              </label>
              <select
                id={`status-${quote.id}`}
                className="select"
                style={{ width: "auto", minHeight: 36, padding: ".35rem .7rem", fontSize: ".85rem" }}
                value={quote.status}
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.value as QuoteRequestStatus;
                  startTransition(async () => {
                    setFeedback(await setQuoteStatusAction(quote.id, next));
                  });
                }}
              >
                {(Object.keys(STATUS_LABELS) as QuoteRequestStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Supprimer définitivement cette demande ?")) return;
                  startTransition(async () => {
                    setFeedback(await deleteQuoteAction(quote.id));
                  });
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div style={{ display: "flex", gap: ".75rem", justifyContent: "space-between" }}>
      <dt style={{ color: "var(--admin-muted)" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
        {href ? <a href={href}>{value}</a> : value}
      </dd>
    </div>
  );
}

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};
