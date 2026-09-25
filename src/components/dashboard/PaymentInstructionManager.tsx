"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  deletePaymentInstructionAction,
  savePaymentInstructionAction,
} from "@/app/dashboard/actions/catalogue";
import { Feedback } from "./SettingsForms";

/**
 * Where customers send their deposit (cahier des charges section 8).
 *
 * These exact strings are shown to the customer and repeated in the email, so
 * the number and the beneficiary name matter more than anything else here.
 */

export type InstructionRow = {
  id: string;
  paymentMethod: string;
  accountNumber: string;
  accountName: string;
  instructions: string | null;
  active: boolean;
};

export function PaymentInstructionManager({
  instructions,
}: {
  instructions: InstructionRow[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  function remove(instruction: InstructionRow) {
    if (!window.confirm(`Supprimer « ${instruction.paymentMethod} » ?`)) return;
    startTransition(async () => {
      setFeedback(await deletePaymentInstructionAction(instruction.id));
    });
  }

  return (
    <div>
      <Feedback state={feedback} />

      {editing === "new" ? (
        <InstructionForm key="new" onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginBottom: "1.25rem" }}
          onClick={() => setEditing("new")}
        >
          Ajouter un moyen de paiement
        </button>
      )}

      {instructions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Aucun moyen de paiement</p>
          <p style={{ margin: ".5rem 0 0", color: "var(--admin-muted)", fontSize: ".9rem", lineHeight: 1.6 }}>
            Sans moyen de paiement, vos clientes ne sauront pas où envoyer leur
            acompte.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".75rem" }}>
          {instructions.map((instruction) => (
            <li key={instruction.id}>
              {editing === instruction.id ? (
                <InstructionForm
                  instruction={instruction}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <div className="card" style={{ opacity: instruction.active ? 1 : 0.6 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: ".75rem",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        {instruction.paymentMethod}
                        {!instruction.active ? (
                          <span className="pill pill-neutral" style={{ marginLeft: ".5rem" }}>
                            Inactif
                          </span>
                        ) : null}
                      </p>
                      <p
                        style={{
                          margin: ".3rem 0 0",
                          fontSize: "1.02rem",
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {instruction.accountNumber}
                      </p>
                      <p style={{ margin: ".15rem 0 0", fontSize: ".85rem", color: "var(--admin-muted)" }}>
                        {instruction.accountName}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={smallButton}
                        onClick={() => setEditing(instruction.id)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                        disabled={pending}
                        onClick={() => remove(instruction)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {instruction.instructions ? (
                    <p
                      style={{
                        margin: ".85rem 0 0",
                        paddingTop: ".75rem",
                        borderTop: "1px solid var(--admin-border)",
                        fontSize: ".88rem",
                        color: "var(--admin-muted)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {instruction.instructions}
                    </p>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InstructionForm({
  instruction,
  onDone,
}: {
  instruction?: InstructionRow;
  onDone: () => void;
}) {
  const action = async (previous: ActionState, formData: FormData) =>
    savePaymentInstructionAction(instruction?.id ?? null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={submit} className="card" style={{ marginBottom: "1.25rem" }} noValidate>
      <p style={{ margin: "0 0 1rem", fontWeight: 700 }}>
        {instruction ? "Modifier le moyen de paiement" : "Nouveau moyen de paiement"}
      </p>

      {state.status === "error" ? <Feedback state={state} /> : null}

      <Text
        id="paymentMethod"
        label="Moyen de paiement"
        placeholder="MTN MoMo, Moov Money, Wave…"
        defaultValue={instruction?.paymentMethod}
        error={errors.paymentMethod}
        required
      />
      <Text
        id="accountNumber"
        label="Numéro à créditer"
        placeholder="97 XX XX XX"
        defaultValue={instruction?.accountNumber}
        error={errors.accountNumber}
        required
      />
      <Text
        id="accountName"
        label="Nom du bénéficiaire"
        defaultValue={instruction?.accountName}
        error={errors.accountName}
        required
        hint="Le nom exact affiché par l'application de paiement, pour rassurer la cliente."
      />

      <div className="field">
        <label className="label" htmlFor="instructions">
          Instructions complémentaires
        </label>
        <textarea
          id="instructions"
          name="instructions"
          className="textarea"
          defaultValue={instruction?.instructions ?? ""}
          maxLength={1000}
          placeholder="Par exemple : mettez votre nom en référence du dépôt."
        />
      </div>

      <div className="field">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".55rem",
            fontSize: ".92rem",
            cursor: "pointer",
            minHeight: 32,
          }}
        >
          <input
            type="checkbox"
            name="active"
            defaultChecked={instruction?.active ?? true}
          />
          <span>Proposer ce moyen de paiement aux clientes</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function Text({
  id,
  label,
  defaultValue,
  error,
  hint,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        className="input"
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
      />
      {hint ? <p className="hint">{hint}</p> : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};
