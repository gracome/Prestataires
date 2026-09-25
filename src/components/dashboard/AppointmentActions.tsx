"use client";

import { useActionState, useState } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { providerActionsFor } from "@/lib/booking/state-machine";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  cancelAppointmentAction,
  confirmPaymentAction,
  confirmWithoutDepositAction,
  markCompletedAction,
  markNoShowAction,
  rejectPaymentAction,
  saveProviderNoteAction,
} from "@/app/dashboard/actions/appointments";

/**
 * The provider's controls on one booking (cahier des charges section 10).
 *
 * Confirm and refuse are the two that matter, so they sit first and the
 * destructive ones are behind a disclosure. Refusing always asks for a motive,
 * because the customer receives it in the refusal email.
 */

const REJECTION_PRESETS = [
  "Preuve illisible.",
  "Montant incorrect.",
  "Paiement non reçu.",
];

export function AppointmentActions({
  appointmentId,
  status,
  hasCurrentProof,
  providerNote,
  customerLink,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  hasCurrentProof: boolean;
  providerNote: string;
  customerLink: string;
}) {
  /**
   * Server actions take the appointment id first; `useActionState` expects
   * exactly (previousState, formData). This closes over the id so each action
   * matches that shape.
   */
  const bind =
    (
      action: (
        id: string,
        previous: ActionState,
        formData: FormData,
      ) => Promise<ActionState>,
    ) =>
    (previous: ActionState, formData: FormData): Promise<ActionState> =>
      action(appointmentId, previous, formData);

  const [confirmState, confirm, confirming] = useActionState(
    bind(confirmPaymentAction),
    IDLE,
  );
  const [rejectState, reject, rejecting] = useActionState(
    bind(rejectPaymentAction),
    IDLE,
  );
  const [noDepositState, confirmNoDeposit, confirmingNoDeposit] = useActionState(
    bind(confirmWithoutDepositAction),
    IDLE,
  );
  const [cancelState, cancel, cancelling] = useActionState(
    bind(cancelAppointmentAction),
    IDLE,
  );
  const [completeState, complete, completing] = useActionState(
    bind(markCompletedAction),
    IDLE,
  );
  const [noShowState, noShow, markingNoShow] = useActionState(
    bind(markNoShowAction),
    IDLE,
  );
  const [noteState, saveNote, savingNote] = useActionState(
    bind(saveProviderNoteAction),
    IDLE,
  );

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const states = [
    confirmState,
    rejectState,
    noDepositState,
    cancelState,
    completeState,
    noShowState,
  ];
  const feedback = states.find(
    (s): s is Extract<ActionState, { message: string }> => s.status !== "idle",
  );

  // Derived from the state machine, never from a hand-written status list,
  // so a button can no longer be offered for a transition that is refused.
  const actions = providerActionsFor(status, { hasPendingProof: hasCurrentProof });
  const canVerify = actions.includes("VERIFY_PAYMENT");
  const canConfirmDirectly = actions.includes("CONFIRM_WITHOUT_DEPOSIT");
  const canCancel = actions.includes("CANCEL");
  const canClose = actions.includes("COMPLETE") || actions.includes("NO_SHOW");

  return (
    <div style={{ display: "grid", gap: ".9rem" }}>
      {feedback ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: ".75rem .9rem",
            borderRadius: 10,
            fontSize: ".9rem",
            background: feedback.status === "success" ? "var(--tone-success-bg)" : "var(--tone-danger-bg)",
            color: feedback.status === "success" ? "var(--tone-success-fg)" : "var(--tone-danger-fg)",
          }}
        >
          {feedback.message}
        </p>
      ) : null}

      {canVerify ? (
        <div className="card">
          <p style={{ margin: "0 0 .35rem", fontWeight: 700 }}>
            Vérifiez la réception de l&apos;acompte
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: ".88rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
            Ouvrez votre application de paiement et vérifiez que le montant est
            bien arrivé avant de confirmer.
          </p>

          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
            <form action={confirm}>
              <button type="submit" className="btn btn-primary" disabled={confirming}>
                {confirming ? "Confirmation…" : "Confirmer le paiement"}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowReject((value) => !value)}
              aria-expanded={showReject}
            >
              Refuser le paiement
            </button>
          </div>

          {showReject ? (
            <form action={reject} style={{ marginTop: "1.25rem" }}>
              <label className="label" htmlFor="reason">
                Motif du refus (envoyé à la cliente)
              </label>

              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginBottom: ".5rem" }}>
                {REJECTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    style={{
                      border: "1px solid var(--admin-border)",
                      background: "var(--admin-surface)",
                      borderRadius: 999,
                      padding: ".3rem .7rem",
                      fontSize: ".8rem",
                      cursor: "pointer",
                      font: "inherit",
                      fontWeight: 500,
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                id="reason"
                name="reason"
                className="textarea"
                style={{ minHeight: 80 }}
                required
                maxLength={500}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />

              {rejectState.status === "error" && rejectState.errors?.reason ? (
                <p className="error-text" role="alert">
                  {rejectState.errors.reason}
                </p>
              ) : null}

              <p style={{ fontSize: ".82rem", color: "var(--admin-muted)", margin: ".5rem 0 .9rem", lineHeight: 1.6 }}>
                Le créneau sera immédiatement remis à disposition.
              </p>

              <button type="submit" className="btn btn-danger" disabled={rejecting}>
                {rejecting ? "Refus en cours…" : "Confirmer le refus"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {canConfirmDirectly ? (
        <div className="card">
          <p style={{ margin: "0 0 .35rem", fontWeight: 700 }}>
            Confirmer sans attendre l&apos;acompte
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: ".88rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
            Utilisez ceci si la cliente vous a réglé directement ou si vous
            acceptez exceptionnellement de confirmer sans acompte.
          </p>
          <form action={confirmNoDeposit}>
            <button type="submit" className="btn btn-primary" disabled={confirmingNoDeposit}>
              {confirmingNoDeposit ? "Confirmation…" : "Confirmer le rendez-vous"}
            </button>
          </form>
        </div>
      ) : null}

      {canClose ? (
        <div className="card">
          <p style={{ margin: "0 0 1rem", fontWeight: 700 }}>Après le rendez-vous</p>
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
            <form action={complete}>
              <button type="submit" className="btn btn-secondary" disabled={completing}>
                {completing ? "…" : "Marquer comme terminé"}
              </button>
            </form>
            <form action={noShow}>
              <button type="submit" className="btn btn-secondary" disabled={markingNoShow}>
                {markingNoShow ? "…" : "Cliente absente"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="card">
        <form action={saveNote}>
          <label className="label" htmlFor="note">
            Note privée
          </label>
          <textarea
            id="note"
            name="note"
            className="textarea"
            style={{ minHeight: 70 }}
            defaultValue={providerNote}
            maxLength={2000}
            placeholder="Visible uniquement par vous."
          />
          <button
            type="submit"
            className="btn btn-secondary"
            style={{ marginTop: ".6rem" }}
            disabled={savingNote}
          >
            {savingNote ? "Enregistrement…" : "Enregistrer la note"}
          </button>
          {noteState.status === "success" ? (
            <span style={{ marginLeft: ".75rem", fontSize: ".85rem", color: "var(--tone-success-fg)" }}>
              {noteState.message}
            </span>
          ) : null}
        </form>
      </div>

      <div className="card">
        <p style={{ margin: "0 0 .5rem", fontWeight: 700, fontSize: ".95rem" }}>
          Lien de suivi de la cliente
        </p>
        <p style={{ margin: "0 0 .6rem", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
          Renvoyez ce lien par WhatsApp si la cliente ne retrouve plus son email.
        </p>
        <code
          style={{
            display: "block",
            fontSize: ".78rem",
            wordBreak: "break-all",
            background: "var(--admin-subtle)",
            padding: ".6rem .7rem",
            borderRadius: 8,
          }}
        >
          {customerLink}
        </code>
      </div>

      {canCancel ? (
        <div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--tone-danger-fg)", padding: 0, textDecoration: "underline" }}
            onClick={() => setShowCancel((value) => !value)}
            aria-expanded={showCancel}
          >
            Annuler ce rendez-vous
          </button>

          {showCancel ? (
            <form action={cancel} className="card" style={{ marginTop: ".75rem" }}>
              <label className="label" htmlFor="cancel-reason">
                Motif (facultatif, envoyé à la cliente)
              </label>
              <textarea
                id="cancel-reason"
                name="reason"
                className="textarea"
                style={{ minHeight: 70 }}
                maxLength={500}
              />
              <p style={{ fontSize: ".82rem", color: "var(--admin-muted)", margin: ".5rem 0 .9rem", lineHeight: 1.6 }}>
                Le créneau sera libéré et l&apos;événement retiré de votre Google
                Calendar.
              </p>
              <button type="submit" className="btn btn-danger" disabled={cancelling}>
                {cancelling ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
