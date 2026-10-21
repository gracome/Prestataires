"use client";

import { useActionState, useState } from "react";
import { type ActionState, updateProviderAction } from "@/app/admin/actions";

/**
 * Editing a provider's account after it exists.
 *
 * Her identity, her contact details, her locale and her palette. Deliberately
 * not her opening hours or her prices: those change with her week and belong
 * to her screens, where she is the one who knows.
 */

const IDLE: ActionState = { status: "idle" };

export type EditableProvider = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
};

export function EditProviderForm({ provider }: { provider: EditableProvider }) {
  const [state, action, pending] = useActionState(updateProviderAction, IDLE);

  return (
    <form action={action}>
      <div className="card">
        <input type="hidden" name="providerId" value={provider.id} />

        <div style={{ display: "grid", gap: ".85rem" }}>
          <div className="ep-pair">
            <Text name="businessName" label="Nom de l'activité" value={provider.businessName} required />
            <Text name="ownerName" label="Responsable" value={provider.ownerName} required />
          </div>

          <div style={{ display: "grid", gap: ".45rem" }}>
            <Text name="email" label="E-mail (identifiant et notifications)" value={provider.email} required type="email" />
            <label style={{ display: "flex", gap: ".5rem", alignItems: "center", fontSize: ".82rem" }}>
              <input type="checkbox" name="sendCredentials" />
              Lui envoyer de nouveaux identifiants à cette adresse (un nouveau mot de passe est généré)
            </label>
            <span style={{ fontSize: ".75rem", color: "var(--admin-muted)" }}>
              Si l&apos;adresse change, un e-mail l&apos;en informe automatiquement. Son mot de passe ne change que si la case est cochée.
            </span>
          </div>

          <Text name="tagline" label="Phrase d'accroche" value={provider.tagline ?? ""} />

          <Area
            name="description"
            label="Présentation"
            value={provider.description ?? ""}
            hint="Quelques lignes sur son activité, affichées sur le site."
          />

          <div className="ep-pair">
            <Text name="phone" label="Téléphone" value={provider.phone ?? ""} />
            <Text name="whatsappPhone" label="WhatsApp" value={provider.whatsappPhone ?? ""} />
          </div>

          <div className="ep-pair">
            <Text name="addressLine" label="Adresse" value={provider.addressLine ?? ""} />
            <Text name="city" label="Ville" value={provider.city ?? ""} />
          </div>

          <div className="ep-pair">
            <Text name="country" label="Pays" value={provider.country ?? ""} />
            <Text name="timezone" label="Fuseau horaire" value={provider.timezone} />
          </div>

          <Text name="currency" label="Devise" value={provider.currency} />

          <div>
            <p style={{ margin: "0 0 .5rem", fontSize: ".8rem", fontWeight: 700 }}>
              Couleurs du site
            </p>
            <div className="ep-colours">
              <Colour name="primaryColor" label="Principale" value={provider.primaryColor} />
              <Colour name="secondaryColor" label="Secondaire" value={provider.secondaryColor} />
              <Colour name="accentColor" label="Accent" value={provider.accentColor} />
              <Colour name="backgroundColor" label="Fond" value={provider.backgroundColor} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: "1.1rem", display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              padding: ".55rem 1rem",
              borderRadius: 9,
              border: "1px solid var(--admin-accent)",
              background: "var(--admin-accent)",
              color: "var(--admin-accent-fg)",
              fontFamily: "inherit",
              fontSize: ".88rem",
              fontWeight: 700,
              cursor: pending ? "progress" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>

          {state.status !== "idle" ? (
            <span
              style={{
                fontSize: ".85rem",
                color: state.status === "success" ? "var(--tone-success-fg)" : "var(--tone-danger-fg)",
              }}
            >
              {state.message}
            </span>
          ) : null}
        </div>

        {state.status === "success" && state.secret ? (
          <pre
            style={{
              margin: ".8rem 0 0",
              padding: ".7rem .8rem",
              borderRadius: 9,
              border: "1px dashed var(--admin-border)",
              background: "var(--admin-surface)",
              fontSize: ".85rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {`Identifiant : ${state.secret.email}
Mot de passe : ${state.secret.password}`}
          </pre>
        ) : null}
      </div>

      <style>{`
        .ep-pair { display: grid; gap: .85rem; }
        .ep-colours {
          display: grid;
          gap: .55rem;
          grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
        }
        @media (min-width: 640px) {
          .ep-pair { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: ".45rem .65rem",
  borderRadius: 9,
  border: "1px solid var(--admin-border)",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
  fontFamily: "inherit",
  fontSize: ".88rem",
};

function Text({
  name,
  label,
  value,
  required,
  type = "text",
}: {
  name: string;
  label: string;
  value: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: ".3rem" }}>
      <span style={{ fontSize: ".78rem", fontWeight: 700 }}>{label}</span>
      <input name={name} type={type} defaultValue={value} required={required} style={inputStyle} />
    </label>
  );
}

function Area({
  name,
  label,
  value,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: ".3rem" }}>
      <span style={{ fontSize: ".78rem", fontWeight: 700 }}>{label}</span>
      <textarea
        name={name}
        defaultValue={value}
        rows={4}
        style={{ ...inputStyle, minHeight: 96, resize: "vertical", lineHeight: 1.6 }}
      />
      {hint ? (
        <span style={{ fontSize: ".76rem", color: "var(--admin-muted)" }}>{hint}</span>
      ) : null}
    </label>
  );
}

function Colour({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  const [colour, setColour] = useState(value);

  return (
    <label style={{ display: "grid", gap: ".3rem" }}>
      <span style={{ fontSize: ".76rem", fontWeight: 600, color: "var(--admin-muted)" }}>
        {label}
      </span>
      <span style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
        <input
          type="color"
          value={colour}
          onChange={(event) => setColour(event.target.value)}
          aria-label={`${label}, sélecteur`}
          style={{
            width: 36,
            height: 36,
            padding: 2,
            border: "1px solid var(--admin-border)",
            borderRadius: 8,
            background: "transparent",
            cursor: "pointer",
          }}
        />
        <input
          name={name}
          value={colour}
          onChange={(event) => setColour(event.target.value)}
          aria-label={`${label}, code couleur`}
          style={{ ...inputStyle, minHeight: 36, fontSize: ".8rem" }}
        />
      </span>
    </label>
  );
}
