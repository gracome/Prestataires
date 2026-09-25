"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { IDLE, type ActionState } from "@/lib/validation";
import {
  saveProfileAction,
  saveSiteSettingsAction,
  saveThemeAction,
} from "@/app/dashboard/actions/settings";
import {
  deleteFaqItemAction,
  saveFaqItemAction,
} from "@/app/dashboard/actions/catalogue";
import {
  BODY_FONTS,
  BUTTON_RADII,
  HEADING_FONTS,
  LAYOUT_VARIANTS,
  readableTextOn,
  type ThemeLike,
} from "@/lib/theme";
import { Feedback } from "./SettingsForms";

/** Identity, appearance and site content (cahier des charges section 20). */

export type ProfileValues = {
  businessName: string;
  ownerName: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  whatsappPrefill: string;
  addressLine: string;
  city: string;
  country: string;
  mapsUrl: string;
  timezone: string;
  currency: string;
  logoUrl: string;
  coverImageUrl: string;
};

export function ProfileForm({
  values,
  timezones,
}: {
  values: ProfileValues;
  timezones: string[];
}) {
  const [state, submit, pending] = useActionState(saveProfileAction, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={submit} className="card" noValidate>
      <Feedback state={state} />

      <div style={grid}>
        <Text id="businessName" label="Nom de l'activité" defaultValue={values.businessName} error={errors.businessName} required />
        <Text id="ownerName" label="Votre nom" defaultValue={values.ownerName} error={errors.ownerName} required />
      </div>

      <Text
        id="tagline"
        label="Accroche"
        defaultValue={values.tagline}
        hint="Une phrase courte affichée sous le nom de votre activité."
        error={errors.tagline}
      />

      <div className="field">
        <label className="label" htmlFor="description">
          Description de votre activité
        </label>
        <textarea
          id="description"
          name="description"
          className="textarea"
          defaultValue={values.description}
          maxLength={4000}
          style={{ minHeight: 140 }}
        />
        <p className="hint">Laissez une ligne vide pour créer un nouveau paragraphe.</p>
      </div>

      <h3 style={subheading}>Contact</h3>

      <div style={grid}>
        <Text id="email" label="Email" type="email" defaultValue={values.email} error={errors.email} required hint="Vous y recevez les notifications de réservation." />
        <Text id="phone" label="Téléphone" type="tel" defaultValue={values.phone} error={errors.phone} />
        <Text id="whatsappPhone" label="Numéro WhatsApp" type="tel" defaultValue={values.whatsappPhone} error={errors.whatsappPhone} />
      </div>

      <div className="field">
        <label className="label" htmlFor="whatsappPrefill">
          Message WhatsApp prérempli
        </label>
        <input
          id="whatsappPrefill"
          name="whatsappPrefill"
          className="input"
          defaultValue={values.whatsappPrefill}
          maxLength={400}
          placeholder="Bonjour, je souhaite avoir des informations concernant une réservation."
        />
      </div>

      <h3 style={subheading}>Localisation</h3>

      <div style={grid}>
        <Text id="addressLine" label="Adresse" defaultValue={values.addressLine} error={errors.addressLine} />
        <Text id="city" label="Ville" defaultValue={values.city} error={errors.city} />
        <Text id="country" label="Pays" defaultValue={values.country} error={errors.country} />
      </div>

      <Text
        id="mapsUrl"
        label="Lien Google Maps"
        type="url"
        defaultValue={values.mapsUrl}
        error={errors.mapsUrl}
        hint="Collez le lien de partage de votre position."
      />

      <h3 style={subheading}>Réglages régionaux</h3>

      <div style={grid}>
        <div className="field">
          <label className="label" htmlFor="timezone">
            Fuseau horaire
          </label>
          <select id="timezone" name="timezone" className="select" defaultValue={values.timezone}>
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
          <p className="hint">Vos horaires sont interprétés dans ce fuseau.</p>
          {errors.timezone ? (
            <p className="error-text" role="alert">
              {errors.timezone}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="currency">
            Devise
          </label>
          <select id="currency" name="currency" className="select" defaultValue={values.currency}>
            <option value="XOF">FCFA (XOF)</option>
            <option value="XAF">FCFA (XAF)</option>
            <option value="EUR">Euro (EUR)</option>
            <option value="MAD">Dirham (MAD)</option>
            <option value="NGN">Naira (NGN)</option>
            <option value="GHS">Cedi (GHS)</option>
            <option value="USD">Dollar (USD)</option>
          </select>
          {errors.currency ? (
            <p className="error-text" role="alert">
              {errors.currency}
            </p>
          ) : null}
        </div>
      </div>

      <h3 style={subheading}>Images</h3>

      <div style={grid}>
        <FileField
          id="logoFile"
          label="Logo"
          currentUrl={values.logoUrl}
          hint="Carré de préférence. JPG, PNG ou WEBP, 5 Mo maximum."
        />
        <FileField
          id="coverFile"
          label="Photo de couverture"
          currentUrl={values.coverImageUrl}
          hint="Affichée en fond de la bannière d'accueil."
        />
      </div>

      <input type="hidden" name="logoUrl" value={values.logoUrl} />
      <input type="hidden" name="coverImageUrl" value={values.coverImageUrl} />

      <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer mes informations"}
      </button>
    </form>
  );
}

export function ThemeForm({ theme }: { theme: ThemeLike }) {
  const [state, submit, pending] = useActionState(saveThemeAction, IDLE);
  const [colors, setColors] = useState({
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    surfaceColor: theme.surfaceColor,
    textColor: theme.textColor,
    mutedTextColor: theme.mutedTextColor,
  });

  return (
    <form action={submit} className="card">
      <Feedback state={state} />

      <div style={grid}>
        <Color id="primaryColor" label="Couleur principale" value={colors.primaryColor} onChange={(v) => setColors((c) => ({ ...c, primaryColor: v }))} />
        <Color id="secondaryColor" label="Couleur secondaire" value={colors.secondaryColor} onChange={(v) => setColors((c) => ({ ...c, secondaryColor: v }))} />
        <Color id="accentColor" label="Couleur d'accent" value={colors.accentColor} onChange={(v) => setColors((c) => ({ ...c, accentColor: v }))} />
        <Color id="backgroundColor" label="Fond de page" value={colors.backgroundColor} onChange={(v) => setColors((c) => ({ ...c, backgroundColor: v }))} />
        <Color id="surfaceColor" label="Fond des cartes" value={colors.surfaceColor} onChange={(v) => setColors((c) => ({ ...c, surfaceColor: v }))} />
        <Color id="textColor" label="Texte" value={colors.textColor} onChange={(v) => setColors((c) => ({ ...c, textColor: v }))} />
        <Color id="mutedTextColor" label="Texte secondaire" value={colors.mutedTextColor} onChange={(v) => setColors((c) => ({ ...c, mutedTextColor: v }))} />
      </div>

      <div style={grid}>
        <Select id="headingFont" label="Police des titres" defaultValue={theme.headingFont} options={HEADING_FONTS.map((f) => ({ value: f, label: f }))} />
        <Select id="bodyFont" label="Police du texte" defaultValue={theme.bodyFont} options={BODY_FONTS.map((f) => ({ value: f, label: f }))} />
        <Select id="buttonRadius" label="Style des boutons" defaultValue={theme.buttonRadius} options={BUTTON_RADII.map((r) => ({ value: r.value, label: r.label }))} />
        <Select id="layoutVariant" label="Disposition" defaultValue={theme.layoutVariant} options={LAYOUT_VARIANTS.map((l) => ({ value: l.value, label: l.label }))} />
      </div>

      <div
        aria-label="Aperçu des couleurs"
        style={{
          marginTop: "1rem",
          borderRadius: 12,
          padding: "1.25rem",
          background: colors.backgroundColor,
          color: colors.textColor,
          border: "1px solid var(--admin-border)",
        }}
      >
        <p style={{ margin: "0 0 .35rem", fontWeight: 700, fontSize: "1.1rem" }}>
          Aperçu
        </p>
        <p style={{ margin: "0 0 1rem", color: colors.mutedTextColor, fontSize: ".9rem" }}>
          Voici comment vos couleurs apparaissent ensemble.
        </p>
        <span
          style={{
            display: "inline-block",
            background: colors.primaryColor,
            color: readableTextOn(colors.primaryColor),
            padding: ".6rem 1.2rem",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: ".9rem",
          }}
        >
          Prendre rendez-vous
        </span>
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: "1.25rem" }} disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer l'apparence"}
      </button>
    </form>
  );
}

export type SiteValues = {
  showAbout: boolean;
  showServices: boolean;
  showPricing: boolean;
  showGallery: boolean;
  showHours: boolean;
  showLocation: boolean;
  showBooking: boolean;
  showContact: boolean;
  showFaq: boolean;
  showQuoteRequest: boolean;
  showRealisations: boolean;
  heroHeadline: string;
  heroSubheadline: string;
  heroEyebrow: string;
  heroCtaLabel: string;
  aboutTitle: string;
  aboutBody: string;
  aboutQuote: string;
  aboutPortraitUrl: string;
  servicesIntro: string;
  realisationsIntro: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
};

const SECTIONS: Array<{ name: keyof SiteValues; label: string }> = [
  { name: "showServices", label: "Prestations" },
  { name: "showPricing", label: "Afficher les tarifs" },
  { name: "showGallery", label: "Aperçu galerie sur l'accueil" },
  { name: "showRealisations", label: "Page Réalisations dédiée" },
  { name: "showAbout", label: "À propos" },
  { name: "showHours", label: "Horaires" },
  { name: "showLocation", label: "Localisation" },
  { name: "showBooking", label: "Réservation en ligne" },
  { name: "showContact", label: "Contact" },
  { name: "showFaq", label: "Questions fréquentes" },
  { name: "showQuoteRequest", label: "Demande de devis" },
];

export function SiteSettingsForm({ values }: { values: SiteValues }) {
  const [state, submit, pending] = useActionState(saveSiteSettingsAction, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form action={submit} className="card">
      <Feedback state={state} />

      <h3 style={{ ...subheading, marginTop: 0 }}>Sections affichées</h3>

      <div style={{ display: "grid", gap: ".35rem", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {SECTIONS.map((section) => (
          <label
            key={section.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".55rem",
              fontSize: ".9rem",
              cursor: "pointer",
              minHeight: 34,
            }}
          >
            <input
              type="checkbox"
              name={section.name}
              defaultChecked={Boolean(values[section.name])}
            />
            <span>{section.label}</span>
          </label>
        ))}
      </div>

      <h3 style={subheading}>Bannière d&apos;accueil</h3>
      <p style={helpText}>
        La bannière est la première chose que voit une visiteuse. Elle affiche
        aussi automatiquement si vous êtes ouverte en ce moment, d&apos;après vos
        horaires.
      </p>

      <Text
        id="heroEyebrow"
        label="Petite ligne au-dessus du titre"
        defaultValue={values.heroEyebrow}
        hint="Par défaut, votre accroche et votre ville. Exemple : « Prothésiste ongulaire · Cotonou »."
      />
      <Text
        id="heroHeadline"
        label="Titre principal"
        defaultValue={values.heroHeadline}
        hint="Par défaut, le nom de votre activité. Une promesse marche mieux qu'un nom."
      />
      <div className="field">
        <label className="label" htmlFor="heroSubheadline">
          Sous-titre
        </label>
        <textarea id="heroSubheadline" name="heroSubheadline" className="textarea" defaultValue={values.heroSubheadline} maxLength={400} style={{ minHeight: 70 }} />
      </div>
      <Text
        id="heroCtaLabel"
        label="Texte du bouton principal"
        defaultValue={values.heroCtaLabel}
        hint="Par défaut : « Prendre rendez-vous »."
      />

      <h3 style={subheading}>Section à propos</h3>

      <Text id="aboutTitle" label="Titre" defaultValue={values.aboutTitle} />
      <div className="field">
        <label className="label" htmlFor="aboutQuote">
          Votre phrase
        </label>
        <textarea
          id="aboutQuote"
          name="aboutQuote"
          className="textarea"
          defaultValue={values.aboutQuote}
          maxLength={400}
          style={{ minHeight: 70 }}
          placeholder="Une cliente ne repart jamais avec un travail que je ne montrerais pas."
        />
        <p className="hint">
          Mise en avant en grand, à côté de votre portrait. Une seule phrase, la
          vôtre.
        </p>
      </div>
      <div className="field">
        <label className="label" htmlFor="aboutBody">
          Texte
        </label>
        <textarea id="aboutBody" name="aboutBody" className="textarea" defaultValue={values.aboutBody} maxLength={4000} style={{ minHeight: 140 }} />
        <p className="hint">Laissez une ligne vide pour créer un nouveau paragraphe.</p>
      </div>
      <FileField
        id="aboutPortraitFile"
        label="Votre portrait"
        currentUrl={values.aboutPortraitUrl}
        hint="Un visage inspire confiance. Format portrait de préférence."
      />
      <input type="hidden" name="aboutPortraitUrl" value={values.aboutPortraitUrl} />

      <h3 style={subheading}>Textes des pages dédiées</h3>

      <div className="field">
        <label className="label" htmlFor="servicesIntro">
          Introduction de la page Prestations
        </label>
        <textarea
          id="servicesIntro"
          name="servicesIntro"
          className="textarea"
          defaultValue={values.servicesIntro}
          maxLength={600}
          style={{ minHeight: 80 }}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="realisationsIntro">
          Introduction de la page Réalisations
        </label>
        <textarea
          id="realisationsIntro"
          name="realisationsIntro"
          className="textarea"
          defaultValue={values.realisationsIntro}
          maxLength={600}
          style={{ minHeight: 80 }}
        />
      </div>

      <h3 style={subheading}>Référencement</h3>

      <Text id="seoTitle" label="Titre pour les moteurs de recherche" defaultValue={values.seoTitle} hint="70 caractères maximum." error={errors.seoTitle} />
      <div className="field">
        <label className="label" htmlFor="seoDescription">
          Description pour les moteurs de recherche
        </label>
        <textarea id="seoDescription" name="seoDescription" className="textarea" defaultValue={values.seoDescription} maxLength={180} style={{ minHeight: 70 }} />
        <p className="hint">160 à 180 caractères. C&apos;est le texte affiché sous votre lien dans Google.</p>
        {errors.seoDescription ? (
          <p className="error-text" role="alert">
            {errors.seoDescription}
          </p>
        ) : null}
      </div>
      <Text id="ogImageUrl" label="Image de partage (URL)" type="url" defaultValue={values.ogImageUrl} hint="Affichée quand votre lien est partagé sur les réseaux." error={errors.ogImageUrl} />

      <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le contenu"}
      </button>
    </form>
  );
}

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  active: boolean;
};

export function FaqManager({ items }: { items: FaqRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(IDLE);

  return (
    <div>
      <Feedback state={feedback} />

      {editing === "new" ? (
        <FaqForm key="new" onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginBottom: "1.25rem" }}
          onClick={() => setEditing("new")}
        >
          Ajouter une question
        </button>
      )}

      {items.length === 0 ? (
        <p style={{ color: "var(--admin-muted)", fontSize: ".9rem" }}>
          Aucune question pour le moment. Une FAQ réduit beaucoup les messages
          répétitifs sur WhatsApp.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".6rem" }}>
          {items.map((item) => (
            <li key={item.id}>
              {editing === item.id ? (
                <FaqForm item={item} onDone={() => setEditing(null)} />
              ) : (
                <div className="card" style={{ opacity: item.active ? 1 : 0.6 }}>
                  <div style={{ display: "flex", gap: ".75rem", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <p style={{ margin: 0, fontWeight: 600, flex: "1 1 200px" }}>{item.question}</p>
                    <div style={{ display: "flex", gap: ".35rem" }}>
                      <button type="button" className="btn btn-secondary" style={smallButton} onClick={() => setEditing(item.id)}>
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ ...smallButton, color: "var(--tone-danger-fg)" }}
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm("Supprimer cette question ?")) return;
                          startTransition(async () => {
                            setFeedback(await deleteFaqItemAction(item.id));
                          });
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: ".6rem 0 0", fontSize: ".9rem", color: "var(--admin-muted)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                    {item.answer}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FaqForm({ item, onDone }: { item?: FaqRow; onDone: () => void }) {
  const action = async (previous: ActionState, formData: FormData) =>
    saveFaqItemAction(item?.id ?? null, previous, formData);

  const [state, submit, pending] = useActionState(action, IDLE);
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  return (
    <form action={submit} className="card" style={{ marginBottom: "1.25rem" }} noValidate>
      {state.status === "error" ? <Feedback state={state} /> : null}

      <Text id="question" label="Question" defaultValue={item?.question} error={errors.question} required />

      <div className="field">
        <label className="label" htmlFor="answer">
          Réponse <span aria-hidden="true">*</span>
        </label>
        <textarea id="answer" name="answer" className="textarea" defaultValue={item?.answer ?? ""} maxLength={2000} required />
        {errors.answer ? (
          <p className="error-text" role="alert">
            {errors.answer}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: ".55rem", fontSize: ".9rem", cursor: "pointer", minHeight: 32 }}>
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} />
          <span>Visible sur le site</span>
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

// ---------------------------------------------------------------------------

function Text({
  id,
  label,
  defaultValue,
  error,
  hint,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  type?: string;
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
        type={type}
        className="input"
        defaultValue={defaultValue}
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

function Select({
  id,
  label,
  defaultValue,
  options,
}: {
  id: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <select id={id} name={id} className="select" defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Color({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
        <input
          id={id}
          name={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: 46,
            height: 46,
            padding: 2,
            border: "1px solid var(--admin-border)",
            borderRadius: 10,
            background: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <input
          className="input"
          value={value.toUpperCase()}
          aria-label={`${label}, code hexadécimal`}
          onChange={(event) => onChange(event.target.value)}
          style={{ fontFamily: "ui-monospace, monospace", fontSize: ".9rem" }}
        />
      </div>
    </div>
  );
}

function FileField({
  id,
  label,
  currentUrl,
  hint,
}: {
  id: string;
  label: string;
  currentUrl: string;
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt=""
          style={{
            display: "block",
            width: 86,
            height: 86,
            objectFit: "cover",
            borderRadius: 10,
            marginBottom: ".5rem",
            border: "1px solid var(--admin-border)",
          }}
        />
      ) : null}
      <input
        id={id}
        name={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="input"
        style={{ paddingBlock: ".55rem" }}
      />
      {hint ? <p className="hint">{hint}</p> : null}
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

const helpText: React.CSSProperties = {
  margin: "0 0 1rem",
  fontSize: ".86rem",
  color: "var(--admin-muted)",
  lineHeight: 1.6,
};

const smallButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 36,
  fontSize: ".85rem",
};
