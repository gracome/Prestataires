"use client";

import { useActionState } from "react";
import type { ProviderStatus } from "@prisma/client";
import {
  type ActionState,
  impersonateAction,
  resetPasswordAction,
  setStatusAction,
} from "@/app/admin/actions";

/**
 * What an administrator can do to a provider account.
 *
 * Each of these is a real intrusion into someone's business, so each says out
 * loud what it will do before it is pressed, and the destructive ones ask for
 * confirmation. Nothing here reads her data: that is the support session, and
 * it is the one button that warns you it will be visible to her.
 */

const IDLE: ActionState = { status: "idle" };

export function ProviderActions({
  providerId,
  businessName,
  status,
}: {
  providerId: string;
  businessName: string;
  status: ProviderStatus;
}) {
  return (
    <div style={{ display: "grid", gap: ".75rem" }}>
      <StatusForm providerId={providerId} status={status} />
      <PasswordForm providerId={providerId} />
      <ImpersonateForm providerId={providerId} businessName={businessName} />
    </div>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;

  if (state.status === "error") {
    return (
      <p style={{ margin: ".6rem 0 0", color: "var(--tone-danger-fg)", fontSize: ".85rem" }}>
        {state.message}
      </p>
    );
  }

  return (
    <div style={{ marginTop: ".6rem" }}>
      <p style={{ margin: 0, color: "var(--tone-success-fg)", fontSize: ".85rem" }}>
        {state.message}
      </p>
      {state.secret ? (
        <pre
          style={{
            margin: ".6rem 0 0",
            padding: ".7rem .8rem",
            borderRadius: 9,
            border: "1px dashed var(--admin-border)",
            background: "var(--admin-surface)",
            fontSize: ".85rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {`Identifiant : ${state.secret.email}\nMot de passe : ${state.secret.password}`}
        </pre>
      ) : null}
    </div>
  );
}

function StatusForm({
  providerId,
  status,
}: {
  providerId: string;
  status: ProviderStatus;
}) {
  const [state, action, pending] = useActionState(setStatusAction, IDLE);
  const suspended = status === "SUSPENDED";

  return (
    <div className="card">
      <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700 }}>
        {suspended ? "Réactiver l'activité" : "Suspendre l'activité"}
      </h3>
      <p style={{ margin: ".3rem 0 .75rem", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        {suspended
          ? "Son site redevient accessible et elle pourra se reconnecter."
          : "Son site public est retiré, ses sessions ouvertes sont fermées et elle ne peut plus se connecter. Les rendez-vous déjà pris ne sont pas touchés."}
      </p>

      <form action={action}>
        <input type="hidden" name="providerId" value={providerId} />
        <input
          type="hidden"
          name="status"
          value={suspended ? "ACTIVE" : "SUSPENDED"}
        />
        <PfSubmit
          pending={pending}
          tone={suspended ? "default" : "danger"}
          confirm={
            suspended
              ? undefined
              : "Suspendre cette activité ? Son site sera retiré et elle sera déconnectée."
          }
        >
          {suspended ? "Réactiver" : "Suspendre"}
        </PfSubmit>
      </form>

      <Feedback state={state} />
    </div>
  );
}

function PasswordForm({ providerId }: { providerId: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, IDLE);

  return (
    <div className="card">
      <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700 }}>
        Réinitialiser le mot de passe
      </h3>
      <p style={{ margin: ".3rem 0 .75rem", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        Un nouveau mot de passe est généré et affiché une seule fois. Ses
        sessions ouvertes sont fermées.
      </p>

      <form action={action}>
        <input type="hidden" name="providerId" value={providerId} />
        <PfSubmit
          pending={pending}
          confirm="Générer un nouveau mot de passe ? L'ancien cessera de fonctionner immédiatement."
        >
          Générer un mot de passe
        </PfSubmit>
      </form>

      <Feedback state={state} />
    </div>
  );
}

function ImpersonateForm({
  providerId,
  businessName,
}: {
  providerId: string;
  businessName: string;
}) {
  return (
    <div className="card" style={{ borderColor: "var(--admin-accent)" }}>
      <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 700 }}>
        Ouvrir une session de support
      </h3>
      <p style={{ margin: ".3rem 0 .75rem", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        C&apos;est le seul moyen de voir ses données, y compris ses clientes.
        Votre session d&apos;administration se ferme, un bandeau reste affiché
        pendant toute la visite, et {businessName} verra dans ses paramètres que
        vous êtes venu, quand et sous quel nom.
      </p>

      <form action={impersonateAction}>
        <input type="hidden" name="providerId" value={providerId} />
        <PfSubmit
          confirm={`Ouvrir une session sur le compte de ${businessName} ? La visite lui sera visible.`}
        >
          Se connecter en tant que {businessName}
        </PfSubmit>
      </form>
    </div>
  );
}

function PfSubmit({
  children,
  pending,
  tone = "default",
  confirm,
}: {
  children: React.ReactNode;
  pending?: boolean;
  tone?: "default" | "danger";
  confirm?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      style={{
        padding: ".5rem .9rem",
        borderRadius: 9,
        border: "1px solid",
        borderColor: tone === "danger" ? "var(--tone-danger-border)" : "var(--admin-border)",
        background: "transparent",
        color: tone === "danger" ? "var(--tone-danger-fg)" : "var(--admin-text)",
        fontFamily: "inherit",
        fontSize: ".85rem",
        fontWeight: 700,
        cursor: pending ? "progress" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "En cours…" : children}
    </button>
  );
}
