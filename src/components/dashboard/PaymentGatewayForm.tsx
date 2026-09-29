"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import type { GatewayMode } from "@prisma/client";
import {
  disableGatewayAction,
  saveGatewayAction,
  testGatewayAction,
} from "@/app/dashboard/actions/settings";
import type { ActionState } from "@/lib/validation";

/**
 * FedaPay, set up by the provider herself.
 *
 * The keys are hers and the money lands on her own FedaPay account; the
 * platform only holds the credentials needed to open a payment page in her
 * name. Secrets are never sent back to the browser once saved — the fields
 * stay empty and blank means "keep the one stored".
 */

const EMPTY: ActionState = { status: "idle" };

export function PaymentGatewayForm({
  webhookUrl,
  account,
}: {
  webhookUrl: string;
  account: {
    mode: GatewayMode;
    publicKey: string;
    enabled: boolean;
    hasWebhookSecret: boolean;
    lastError: string | null;
  } | null;
}) {
  const [saveState, save, saving] = useActionState(saveGatewayAction, EMPTY);
  const [testState, test, testing] = useActionState(testGatewayAction, EMPTY);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <p style={muted}>
        Créez un compte sur fedapay.com, puis copiez vos clés ici. Les paiements
        arrivent directement sur votre compte FedaPay : la plateforme ne touche
        pas à cet argent et ne prélève aucune commission.
      </p>

      {account ? (
        <p
          style={{
            ...muted,
            margin: 0,
            fontWeight: 600,
            color: account.enabled ? "inherit" : "var(--admin-muted)",
          }}
        >
          {account.enabled
            ? account.mode === "LIVE"
              ? "Actif — vos clientes règlent leur acompte en ligne."
              : "Actif en mode test — aucun argent réel n'est encaissé."
            : "Inactif — les acomptes passent par dépôt et envoi de reçu."}
        </p>
      ) : null}

      {account?.lastError ? (
        <p style={{ ...muted, margin: 0, color: "var(--admin-danger, #b42318)" }}>
          Dernière erreur FedaPay : {account.lastError}
        </p>
      ) : null}

      <form action={save} style={{ display: "grid", gap: ".7rem" }}>
        <label style={label}>
          Environnement
          <select name="mode" defaultValue={account?.mode ?? "SANDBOX"} className="select">
            <option value="SANDBOX">Test — pour essayer sans argent réel</option>
            <option value="LIVE">Réel — encaisse vraiment</option>
          </select>
        </label>

        <label style={label}>
          Clé publique
          <input
            type="text"
            name="publicKey"
            defaultValue={account?.publicKey ?? ""}
            placeholder="pk_sandbox_…"
            className="input"
            required
          />
        </label>

        <label style={label}>
          Clé secrète
          <PasswordInput
            name="secretKey"
            placeholder={account ? "Inchangée" : "sk_sandbox_…"}
            autoComplete="off"
          />
        </label>

        <label style={label}>
          Clé de signature du webhook
          <PasswordInput
            name="webhookSecret"
            placeholder={account?.hasWebhookSecret ? "Inchangée" : "wh_…"}
            autoComplete="off"
          />
        </label>

        <button type="submit" className="btn btn-secondary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer les clés"}
        </button>

        <Feedback state={saveState} />
      </form>

      <div>
        <p style={{ ...muted, marginBottom: ".3rem" }}>
          Dans FedaPay, déclarez cette adresse comme webhook. Sans elle, un
          paiement réussi ne confirmerait pas la réservation.
        </p>
        <code style={code}>{webhookUrl}</code>
      </div>

      <form action={test} style={{ display: "grid", gap: ".6rem" }}>
        <button type="submit" className="btn btn-primary" disabled={testing || !account}>
          {testing ? "Vérification…" : "Vérifier et activer"}
        </button>
        <Feedback state={testState} />
      </form>

      {account?.enabled ? (
        <form action={async () => { await disableGatewayAction(); }}>
          <button type="submit" className="btn btn-ghost">
            Désactiver le paiement en ligne
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      style={{
        margin: 0,
        fontSize: ".84rem",
        color: state.status === "error" ? "var(--admin-danger, #b42318)" : "inherit",
      }}
    >
      {state.message}
    </p>
  );
}

const muted = {
  margin: 0,
  fontSize: ".85rem",
  lineHeight: 1.65,
  color: "var(--admin-muted)",
} as const;

const label = {
  display: "grid",
  gap: ".3rem",
  fontSize: ".82rem",
  fontWeight: 600,
} as const;

const code = {
  display: "block",
  fontSize: ".78rem",
  wordBreak: "break-all",
  background: "var(--admin-background, rgba(0,0,0,.04))",
  padding: ".5rem .6rem",
  borderRadius: 8,
} as const;
