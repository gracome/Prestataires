"use client";

import { useActionState } from "react";
import { setCustomDomainAction } from "@/app/dashboard/actions/settings";
import type { ActionState } from "@/lib/validation";

/**
 * The provider's own domain.
 *
 * Saving the name here is only half the job: the DNS has to point at the
 * platform before anything serves. The instructions therefore sit beside the
 * field rather than behind a link, because a provider who saves and sees
 * nothing happen will conclude the feature is broken.
 */

const EMPTY: ActionState = { status: "idle" };

export function CustomDomainForm({
  domain,
  platformHost,
}: {
  domain: string | null;
  platformHost: string;
}) {
  const [state, action, pending] = useActionState(setCustomDomainAction, EMPTY);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form action={action} style={{ display: "grid", gap: ".7rem" }}>
        <label style={label}>
          Votre domaine
          <input
            type="text"
            name="domain"
            defaultValue={domain ?? ""}
            placeholder="mon-salon.com"
            className="input"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <p style={muted}>
          Sans le <code>www.</code> ni le <code>https://</code> — nous acceptons
          les deux formes automatiquement. Laissez vide pour revenir à votre
          adresse actuelle.
        </p>

        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer le domaine"}
        </button>

        {state.status !== "idle" ? (
          <p
            role="status"
            style={{
              margin: 0,
              fontSize: ".84rem",
              color:
                state.status === "error" ? "var(--admin-danger, #b42318)" : "inherit",
            }}
          >
            {state.message}
          </p>
        ) : null}
      </form>

      {domain ? (
        <div>
          <p style={{ ...muted, marginBottom: ".4rem", fontWeight: 600 }}>
            Chez votre registrar, créez ces deux enregistrements :
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: ".3rem" }}>
            <li style={item}>
              <code>CNAME</code> — nom <code>www</code>, valeur{" "}
              <code>{platformHost}</code>
            </li>
            <li style={item}>
              <code>CNAME</code> ou <code>ALIAS</code> — nom <code>@</code>,
              valeur <code>{platformHost}</code>
            </li>
          </ul>
          <p style={{ ...muted, marginTop: ".5rem" }}>
            La propagation prend de quelques minutes à quelques heures. Le
            certificat de sécurité est émis automatiquement ensuite.
          </p>
        </div>
      ) : null}
    </div>
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

const item = { fontSize: ".84rem", lineHeight: 1.7 } as const;
