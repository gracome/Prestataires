"use client";

import { useActionState, useTransition, useState } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  changePasswordAction,
  disconnectGoogleAction,
  saveBookingSettingsAction,
  setProviderStatusAction,
  syncGoogleAction,
} from "@/app/dashboard/actions/settings";

/** Forms on the settings screen (cahier des charges sections 11, 12, 14, 23). */

export type BookingSettingsValues = {
  bookingEnabled: boolean;
  slotGranularityMinutes: number;
  bufferAfterMinutes: number;
  minLeadTimeMinutes: number;
  maxAdvanceDays: number;
  holdDurationMinutes: number;
  proofDeadlineMinutes: number;
  verificationDeadlineMinutes: number;
  syncToGoogleCalendar: boolean;
  blockOnGoogleBusy: boolean;
  requireCustomerEmail: boolean;
  allowCustomerCancellation: boolean;
  cancellationNoticeHours: number;
  cancellationPolicy: string;
  bookingTerms: string;
};

export function BookingSettingsForm({
  values,
  googleConnected,
}: {
  values: BookingSettingsValues;
  googleConnected: boolean;
}) {
  const [state, submit, pending] = useActionState(saveBookingSettingsAction, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={submit} className="card">
      <Feedback state={state} />

      <Check
        name="bookingEnabled"
        label="Réservation en ligne ouverte"
        hint="Décochez pour fermer temporairement la prise de rendez-vous sans retirer votre site."
        defaultChecked={values.bookingEnabled}
      />

      <div style={grid}>
        <Number
          id="slotGranularityMinutes"
          label="Pas des créneaux (minutes)"
          defaultValue={values.slotGranularityMinutes}
          hint="Intervalle entre deux heures proposées, par exemple 30."
          error={errors.slotGranularityMinutes}
        />
        <Number
          id="bufferAfterMinutes"
          label="Battement après chaque RDV"
          defaultValue={values.bufferAfterMinutes}
          hint="Minutes gardées libres après chaque prestation."
          error={errors.bufferAfterMinutes}
        />
        <Number
          id="minLeadTimeMinutes"
          label="Délai minimum avant réservation"
          defaultValue={values.minLeadTimeMinutes}
          hint="En minutes. 120 empêche de réserver moins de 2 h à l'avance."
          error={errors.minLeadTimeMinutes}
        />
        <Number
          id="maxAdvanceDays"
          label="Réservation possible jusqu'à (jours)"
          defaultValue={values.maxAdvanceDays}
          error={errors.maxAdvanceDays}
        />
      </div>

      <h3 style={subheading}>Acompte et délais</h3>

      <div style={grid}>
        <Number
          id="holdDurationMinutes"
          label="Blocage temporaire du créneau (minutes)"
          defaultValue={values.holdDurationMinutes}
          hint="Durée pendant laquelle le créneau est gardé après la réservation."
          error={errors.holdDurationMinutes}
        />
        <Number
          id="proofDeadlineMinutes"
          label="Délai pour envoyer la preuve (minutes)"
          defaultValue={values.proofDeadlineMinutes}
          hint="Passé ce délai, la réservation expire et le créneau est libéré."
          error={errors.proofDeadlineMinutes}
        />
        <Number
          id="verificationDeadlineMinutes"
          label="Délai pour vérifier la preuve (minutes)"
          defaultValue={values.verificationDeadlineMinutes}
          hint="Temps dont vous disposez pour confirmer ou refuser un acompte."
          error={errors.verificationDeadlineMinutes}
        />
      </div>

      <h3 style={subheading}>Clientes</h3>

      <Check
        name="requireCustomerEmail"
        label="Email obligatoire à la réservation"
        hint="Sans email, la cliente ne peut pas recevoir de confirmation."
        defaultChecked={values.requireCustomerEmail}
      />
      <Check
        name="allowCustomerCancellation"
        label="Autoriser l'annulation en ligne"
        defaultChecked={values.allowCustomerCancellation}
      />
      <Number
        id="cancellationNoticeHours"
        label="Préavis d'annulation (heures)"
        defaultValue={values.cancellationNoticeHours}
        error={errors.cancellationNoticeHours}
      />

      <Textarea
        id="cancellationPolicy"
        label="Politique d'annulation"
        defaultValue={values.cancellationPolicy}
        hint="Affichée sur votre site et dans le récapitulatif de réservation."
      />
      <Textarea
        id="bookingTerms"
        label="Conditions de réservation"
        defaultValue={values.bookingTerms}
      />

      <h3 style={subheading}>Google Calendar</h3>

      <Check
        name="syncToGoogleCalendar"
        label="Créer un événement pour chaque rendez-vous confirmé"
        defaultChecked={values.syncToGoogleCalendar}
        disabled={!googleConnected}
      />
      <Check
        name="blockOnGoogleBusy"
        label="Bloquer les créneaux occupés dans Google Calendar"
        defaultChecked={values.blockOnGoogleBusy}
        disabled={!googleConnected}
      />
      {!googleConnected ? (
        <p className="hint" style={{ marginTop: "-.5rem" }}>
          Connectez votre calendrier ci-dessous pour activer ces options.
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ marginTop: "1.25rem" }}
        disabled={pending}
      >
        {pending ? "Enregistrement…" : "Enregistrer les règles"}
      </button>
    </form>
  );
}

export function GoogleCalendarPanel({
  connected,
  account,
  lastSyncedAt,
  lastSyncError,
  configured,
}: {
  connected: boolean;
  account: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  if (!configured) {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "var(--admin-muted)", lineHeight: 1.65, fontSize: ".92rem" }}>
          La connexion Google Calendar n&apos;est pas configurée sur cette
          installation. L&apos;administrateur doit renseigner les identifiants
          OAuth de l&apos;application.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <Feedback state={feedback} />

      {connected ? (
        <>
          <p style={{ margin: "0 0 .35rem", fontWeight: 600 }}>
            Connecté à {account}
          </p>
          <p style={{ margin: "0 0 1rem", fontSize: ".85rem", color: "var(--admin-muted)" }}>
            {lastSyncError
              ? `Dernière erreur : ${lastSyncError}`
              : lastSyncedAt
                ? `Dernière synchronisation : ${lastSyncedAt}`
                : "Pas encore synchronisé."}
          </p>

          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => setFeedback(await syncGoogleAction()))
              }
            >
              {pending ? "Synchronisation…" : "Synchroniser maintenant"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: "var(--tone-danger-fg)" }}
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Déconnecter Google Calendar ?")) return;
                startTransition(async () => setFeedback(await disconnectGoogleAction()));
              }}
            >
              Déconnecter
            </button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 1rem", color: "var(--admin-muted)", lineHeight: 1.65, fontSize: ".92rem" }}>
            Connectez votre Google Calendar pour que vos rendez-vous confirmés
            y soient ajoutés automatiquement, et pour que vos occupations
            personnelles bloquent les créneaux proposés. Votre mot de passe
            Google n&apos;est jamais demandé ni conservé.
          </p>
          {/*
            A plain anchor, not next/link: this target is a route handler that
            answers with a redirect to Google's consent screen, so the browser
            has to leave the application rather than navigate client-side.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/google/connect" className="btn btn-primary">
            Connecter Google Calendar
          </a>
        </>
      )}
    </div>
  );
}

export function SiteStatusPanel({ status }: { status: "ACTIVE" | "DRAFT" | "SUSPENDED" }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  if (status === "SUSPENDED") {
    return (
      <div className="card">
        <p style={{ margin: 0, color: "var(--tone-danger-fg)", fontSize: ".92rem", lineHeight: 1.6 }}>
          Ce compte est suspendu. Contactez l&apos;administrateur de la
          plateforme.
        </p>
      </div>
    );
  }

  const online = status === "ACTIVE";

  return (
    <div className="card">
      <Feedback state={feedback} />

      <p style={{ margin: "0 0 .35rem", fontWeight: 600 }}>
        {online ? "Votre site est en ligne" : "Votre site est en brouillon"}
      </p>
      <p style={{ margin: "0 0 1rem", fontSize: ".88rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        {online
          ? "Vos clientes peuvent le consulter et réserver."
          : "Personne ne peut y accéder tant qu'il est en brouillon."}
      </p>

      <button
        type="button"
        className={online ? "btn btn-secondary" : "btn btn-primary"}
        disabled={pending}
        onClick={() =>
          startTransition(async () =>
            setFeedback(await setProviderStatusAction(online ? "DRAFT" : "ACTIVE")),
          )
        }
      >
        {pending
          ? "…"
          : online
            ? "Repasser en brouillon"
            : "Mettre mon site en ligne"}
      </button>
    </div>
  );
}

export function PasswordForm() {
  const [state, submit, pending] = useActionState(changePasswordAction, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={submit} className="card">
      <Feedback state={state} />

      <div className="field">
        <label className="label" htmlFor="currentPassword">
          Mot de passe actuel
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
        {errors.currentPassword ? (
          <p className="error-text" role="alert">
            {errors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label" htmlFor="newPassword">
          Nouveau mot de passe
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <p className="hint">
          Au moins 10 caractères, avec majuscules, minuscules et chiffres.
        </p>
        {errors.newPassword ? (
          <p className="error-text" role="alert">
            {errors.newPassword}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label className="label" htmlFor="confirmPassword">
          Confirmer le nouveau mot de passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="input"
          autoComplete="new-password"
          required
        />
        {errors.confirmPassword ? (
          <p className="error-text" role="alert">
            {errors.confirmPassword}
          </p>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Modification…" : "Modifier mon mot de passe"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function Feedback({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;

  return (
    <p
      role="status"
      style={{
        margin: "0 0 1rem",
        padding: ".75rem .9rem",
        borderRadius: 10,
        fontSize: ".9rem",
        lineHeight: 1.55,
        background: state.status === "success" ? "var(--tone-success-bg)" : "var(--tone-danger-bg)",
        color: state.status === "success" ? "var(--tone-success-fg)" : "var(--tone-danger-fg)",
      }}
    >
      {state.message}
    </p>
  );
}

function Number({
  id,
  label,
  defaultValue,
  hint,
  error,
}: {
  id: string;
  label: string;
  defaultValue: number;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="numeric"
        className="input"
        defaultValue={defaultValue}
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

function Textarea({
  id,
  label,
  defaultValue,
  hint,
}: {
  id: string;
  label: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        className="textarea"
        defaultValue={defaultValue}
        maxLength={2000}
      />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

function Check({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: ".6rem",
          fontSize: ".92rem",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          minHeight: 32,
        }}
      >
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          disabled={disabled}
          style={{ marginTop: ".2rem" }}
        />
        <span>
          <span style={{ fontWeight: 500 }}>{label}</span>
          {hint ? (
            <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem", marginTop: ".15rem" }}>
              {hint}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: "0 1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
};

const subheading: React.CSSProperties = {
  fontSize: ".95rem",
  fontWeight: 700,
  margin: "1.5rem 0 .75rem",
};
