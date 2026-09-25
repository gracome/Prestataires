"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type ActionState, createProviderAction } from "@/app/admin/actions";
import { ActivityPicker } from "./ActivityPicker";
import type { Activity } from "@/lib/platform/activities";

/**
 * Creating a provider from the browser.
 *
 * Same defaults as the command line script, because both call the same
 * function. The generated password is shown once and never again, so the
 * screen says so before it is dismissed.
 */

const IDLE: ActionState = { status: "idle" };

export function CreateProviderForm({ activities }: { activities: Activity[] }) {
  const [state, action, pending] = useActionState(createProviderAction, IDLE);

  if (state.status === "success" && state.secret) {
    return (
      <div className="card" style={{ borderColor: "var(--tone-success-border)" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          Activité créée
        </h2>
        <p style={{ margin: ".4rem 0 .9rem", fontSize: ".88rem", lineHeight: 1.6 }}>
          {state.message}
        </p>

        <pre
          style={{
            margin: 0,
            padding: ".85rem",
            borderRadius: 9,
            border: "1px dashed var(--admin-border)",
            background: "var(--admin-surface)",
            fontSize: ".9rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {`Identifiant : ${state.secret.email}\nMot de passe : ${state.secret.password}`}
        </pre>

        <p style={{ margin: ".9rem 0 0", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
          L&apos;activité démarre en brouillon : son site public n&apos;est pas
          en ligne tant qu&apos;elle ne l&apos;a pas publié depuis ses
          paramètres.
        </p>

        <p style={{ margin: "1rem 0 0", display: "flex", gap: "1rem" }}>
          <Link href="/admin/prestataires">Voir la liste</Link>
          <Link href="/admin/prestataires/nouveau">Créer une autre activité</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action}>
      <div className="card">
        <div style={{ display: "grid", gap: ".9rem" }}>
          <Field
            name="businessName"
            label="Nom de l'activité"
            hint="Tel qu'il apparaîtra sur le site public."
            required
            error={state.status === "error" && state.field === "businessName" ? state.message : undefined}
          />
          <Field
            name="ownerName"
            label="Nom de la responsable"
            required
            error={state.status === "error" && state.field === "ownerName" ? state.message : undefined}
          />
          <Field
            name="email"
            label="E-mail de connexion"
            type="email"
            hint="Sert aussi d'identifiant."
            required
            error={state.status === "error" && state.field === "email" ? state.message : undefined}
          />
          <Field
            name="slug"
            label="Adresse du site"
            hint="Laissez vide pour la déduire du nom. Donne l'adresse /mon-studio."
            error={state.status === "error" && state.field === "slug" ? state.message : undefined}
          />

          <Field
            name="tagline"
            label="Phrase d'accroche"
            hint="Laissez vide pour reprendre celle du métier choisi."
          />

          <div className="pf-pair">
            <Field name="phone" label="Téléphone" />
            <Field name="whatsappPhone" label="WhatsApp" hint="Vide : le téléphone est repris." />
          </div>

          <div className="pf-pair">
            <Field name="addressLine" label="Adresse" />
            <Field name="city" label="Ville" />
          </div>

          <div className="pf-pair">
            <Field
              name="timezone"
              label="Fuseau horaire"
              defaultValue="Africa/Porto-Novo"
            />
            <Field name="currency" label="Devise" defaultValue="XOF" />
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--admin-border)", margin: ".4rem 0" }} />

          <ActivityPicker activities={activities} />

          <label style={{ display: "flex", gap: ".5rem", alignItems: "flex-start", fontSize: ".85rem", lineHeight: 1.5 }}>
            <input type="checkbox" name="seedCatalogue" defaultChecked style={{ marginTop: ".2rem" }} />
            <span>
              Créer les catégories et les prestations de départ du métier
              choisi. Décochez si elle vous a déjà donné son propre catalogue.
            </span>
          </label>
        </div>

        {state.status === "error" && !state.field ? (
          <p style={{ margin: "1rem 0 0", color: "var(--tone-danger-fg)", fontSize: ".85rem" }}>
            {state.message}
          </p>
        ) : null}

        <div style={{ marginTop: "1.25rem", display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: ".6rem 1.1rem",
              borderRadius: 9,
              border: "1px solid var(--admin-accent)",
              background: "var(--admin-accent)",
              color: "var(--admin-accent-fg)",
              fontFamily: "inherit",
              fontSize: ".9rem",
              fontWeight: 700,
              cursor: pending ? "progress" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Création…" : "Créer l'activité"}
          </button>

          <Link
            href="/admin/prestataires"
            style={{
              padding: ".6rem 1.1rem",
              borderRadius: 9,
              border: "1px solid var(--admin-border)",
              fontSize: ".9rem",
              fontWeight: 700,
              textDecoration: "none",
              color: "var(--admin-text)",
            }}
          >
            Annuler
          </Link>
        </div>
      </div>

      <style>{`
        .pf-pair { display: grid; gap: .9rem; }
        @media (min-width: 620px) {
          .pf-pair { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  type = "text",
  required,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        style={{ display: "block", fontSize: ".8rem", fontWeight: 700, marginBottom: ".3rem" }}
      >
        {label}
        {required ? <span style={{ color: "var(--admin-muted)" }}> *</span> : null}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        style={{
          width: "100%",
          minHeight: 42,
          padding: ".5rem .7rem",
          borderRadius: 9,
          border: `1px solid ${error ? "rgb(239 68 68 / 60%)" : "var(--admin-border)"}`,
          background: "var(--admin-surface)",
          color: "var(--admin-text)",
          fontFamily: "inherit",
          fontSize: ".9rem",
        }}
      />

      {error ? (
        <p style={{ margin: ".3rem 0 0", fontSize: ".78rem", color: "var(--tone-danger-fg)" }}>
          {error}
        </p>
      ) : hint ? (
        <p style={{ margin: ".3rem 0 0", fontSize: ".78rem", color: "var(--admin-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
