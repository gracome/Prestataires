"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Customer-initiated cancellation, behind a confirmation step. */
export function CancelBooking({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function cancel() {
    setWorking(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reservation/${encodeURIComponent(token)}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.error ?? "L'annulation a échoué.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Connexion interrompue. Réessayez.");
    } finally {
      setWorking(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost"
        style={{ color: "var(--brand-muted)", textDecoration: "underline", padding: 0 }}
        onClick={() => setOpen(true)}
      >
        Annuler ce rendez-vous
      </button>
    );
  }

  return (
    <div className="card">
      <p style={{ margin: "0 0 .75rem", fontWeight: 600 }}>
        Confirmer l&apos;annulation ?
      </p>
      <p style={{ margin: "0 0 .9rem", fontSize: ".88rem", color: "var(--brand-muted)", lineHeight: 1.6 }}>
        Le créneau sera immédiatement remis à disposition. Cette action est
        définitive.
      </p>

      <label className="label" htmlFor="cancel-reason">
        Motif (facultatif)
      </label>
      <textarea
        id="cancel-reason"
        className="textarea"
        style={{ minHeight: 70 }}
        maxLength={500}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />

      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: ".5rem", marginTop: ".9rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setOpen(false)}
          disabled={working}
        >
          Garder mon rendez-vous
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={cancel}
          disabled={working}
        >
          {working ? "Annulation…" : "Confirmer l'annulation"}
        </button>
      </div>
    </div>
  );
}
