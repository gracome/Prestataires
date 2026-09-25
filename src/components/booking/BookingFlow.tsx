"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The customer booking journey (cahier des charges section 7).
 *
 * Four steps: prestation, créneau, coordonnées, résumé. Date and slot are one
 * screen because on a phone that is a single decision, not two, and it saves a
 * round trip through a transition most people would otherwise bounce off.
 *
 * Availability is re-fetched whenever the service or the visible week changes,
 * and again after a failed submission, so an expired hold elsewhere shows up
 * without a reload.
 */

export type FlowService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationLabel: string;
  priceLabel: string;
  depositLabel: string | null;
  depositRequired: boolean;
};

export type FlowSettings = {
  requireCustomerEmail: boolean;
  bookingTerms: string | null;
  cancellationPolicy: string | null;
  holdDurationMinutes: number;
};

type SlotDto = {
  startsAt: string;
  endsAt: string;
  label: string;
  endLabel: string;
};

type DayDto = { date: string; isOpen: boolean; slots: SlotDto[] };

type Step = "service" | "slot" | "details" | "summary";

const STEP_LABELS: Record<Step, string> = {
  service: "Prestation",
  slot: "Créneau",
  details: "Vos coordonnées",
  summary: "Confirmation",
};

const STEPS: Step[] = ["service", "slot", "details", "summary"];
const WINDOW_DAYS = 14;

export function BookingFlow({
  slug,
  services,
  settings,
  initialServiceId,
  today,
}: {
  slug: string;
  services: FlowService[];
  settings: FlowSettings;
  initialServiceId?: string;
  /**
   * Today's date in the provider timezone, computed on the server. Using the
   * visitor's own clock would shift the calendar by a day for anyone booking
   * from another timezone.
   */
  today: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(initialServiceId ? "slot" : "service");
  const [serviceId, setServiceId] = useState<string | null>(
    initialServiceId ?? null,
  );
  const [rangeStart, setRangeStart] = useState<string>(today);
  const [days, setDays] = useState<DayDto[]>([]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotDto | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerNote: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  // Guards against a slow response overwriting a newer one.
  const requestId = useRef(0);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const loadAvailability = useCallback(
    async (targetService: string, from: string) => {
      const ticket = ++requestId.current;
      setLoadingSlots(true);
      setLoadError(null);

      try {
        const to = addDaysIso(from, WINDOW_DAYS - 1);
        const response = await fetch(
          `/api/public/${encodeURIComponent(slug)}/availability?serviceId=${encodeURIComponent(targetService)}&from=${from}&to=${to}`,
          { headers: { accept: "application/json" }, cache: "no-store" },
        );

        const payload = await response.json();
        if (ticket !== requestId.current) return;

        if (!response.ok) {
          setDays([]);
          setLoadError(payload?.error ?? "Impossible de charger les disponibilités.");
          return;
        }

        const loaded: DayDto[] = payload.days ?? [];
        setDays(loaded);

        setActiveDate((current) => {
          if (current && loaded.some((d) => d.date === current && d.slots.length > 0)) {
            return current;
          }
          return loaded.find((d) => d.slots.length > 0)?.date ?? null;
        });
      } catch {
        if (ticket !== requestId.current) return;
        setDays([]);
        setLoadError(
          "Connexion interrompue. Vérifiez votre réseau puis réessayez.",
        );
      } finally {
        if (ticket === requestId.current) setLoadingSlots(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    if (!serviceId) return;
    void loadAvailability(serviceId, rangeStart);
  }, [serviceId, rangeStart, loadAvailability]);

  // Move focus to the step heading so a screen reader announces the change.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const activeDay = days.find((d) => d.date === activeDate) ?? null;
  const stepIndex = STEPS.indexOf(step);

  function chooseService(id: string) {
    setServiceId(id);
    setSlot(null);
    setActiveDate(null);
    setRangeStart(today);
    setStep("slot");
  }

  function goBack() {
    if (step === "slot") setStep("service");
    else if (step === "details") setStep("slot");
    else if (step === "summary") setStep("details");
  }

  function validateDetails(): boolean {
    const errors: Record<string, string> = {};

    if (form.customerName.trim().length < 2) {
      errors.customerName = "Merci d'indiquer votre nom.";
    }
    if (!/^\+?[0-9 ().-]{6,24}$/.test(form.customerPhone.trim())) {
      errors.customerPhone = "Numéro de téléphone invalide.";
    }
    const email = form.customerEmail.trim();
    if (settings.requireCustomerEmail && !email) {
      errors.customerEmail = "Votre email est requis pour recevoir la confirmation.";
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.customerEmail = "Adresse email invalide.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit() {
    if (!service || !slot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/public/${encodeURIComponent(slug)}/bookings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          startsAt: slot.startsAt,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim() || undefined,
          customerNote: form.customerNote.trim() || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        if (payload?.code === "SLOT_TAKEN") {
          setSubmitError(
            "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.",
          );
          setSlot(null);
          setStep("slot");
          if (serviceId) void loadAvailability(serviceId, rangeStart);
        } else {
          setSubmitError(payload?.error ?? "La réservation n'a pas pu être enregistrée.");
          if (payload?.errors) {
            setFieldErrors(payload.errors);
            setStep("details");
          }
        }
        return;
      }

      router.push(payload.redirectTo);
    } catch {
      setSubmitError(
        "Connexion interrompue. Votre réservation n'a pas été enregistrée, réessayez.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-narrow" style={{ paddingBlock: "1.5rem 3rem" }}>
      <ol
        aria-label="Étapes de la réservation"
        style={{
          display: "flex",
          gap: ".4rem",
          listStyle: "none",
          margin: "0 0 1.75rem",
          padding: 0,
        }}
      >
        {STEPS.map((name, index) => (
          <li key={name} style={{ flex: 1 }}>
            <div
              style={{
                height: 4,
                borderRadius: 999,
                background:
                  index <= stepIndex ? "var(--brand-primary)" : "var(--brand-border)",
              }}
            />
            <span
              style={{
                display: "block",
                fontSize: ".68rem",
                marginTop: ".4rem",
                color: index <= stepIndex ? "var(--brand-text)" : "var(--brand-muted)",
                fontWeight: index === stepIndex ? 700 : 500,
              }}
            >
              {STEP_LABELS[name]}
            </span>
          </li>
        ))}
      </ol>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display"
        style={{ fontSize: "1.65rem", margin: "0 0 1.25rem", outline: "none" }}
      >
        {step === "service" && "Choisissez votre prestation"}
        {step === "slot" && "Choisissez votre créneau"}
        {step === "details" && "Vos coordonnées"}
        {step === "summary" && "Vérifiez votre réservation"}
      </h1>

      {submitError ? (
        <p role="alert" className="card" style={alertStyle}>
          {submitError}
        </p>
      ) : null}

      {step === "service" ? (
        <ServiceStep services={services} onChoose={chooseService} />
      ) : null}

      {step === "slot" && service ? (
        <SlotStep
          service={service}
          days={days}
          activeDate={activeDate}
          activeDay={activeDay}
          slot={slot}
          loading={loadingSlots}
          error={loadError}
          rangeStart={rangeStart}
          today={today}
          onPickDate={(date) => {
            setActiveDate(date);
            setSlot(null);
          }}
          onPickSlot={(picked) => setSlot(picked)}
          onShiftRange={(direction) => {
            setSlot(null);
            setRangeStart((current) =>
              direction === "next"
                ? addDaysIso(current, WINDOW_DAYS)
                : maxIso(today, addDaysIso(current, -WINDOW_DAYS)),
            );
          }}
          onBack={goBack}
          onContinue={() => setStep("details")}
        />
      ) : null}

      {step === "details" ? (
        <DetailsStep
          form={form}
          errors={fieldErrors}
          requireEmail={settings.requireCustomerEmail}
          onChange={(field, value) => {
            setForm((current) => ({ ...current, [field]: value }));
            setFieldErrors((current) => {
              if (!current[field]) return current;
              const next = { ...current };
              delete next[field];
              return next;
            });
          }}
          onBack={goBack}
          onContinue={() => {
            if (validateDetails()) setStep("summary");
          }}
        />
      ) : null}

      {step === "summary" && service && slot ? (
        <SummaryStep
          service={service}
          slot={slot}
          date={activeDate ?? ""}
          form={form}
          settings={settings}
          submitting={submitting}
          onBack={goBack}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ServiceStep({
  services,
  onChoose,
}: {
  services: FlowService[];
  onChoose: (id: string) => void;
}) {
  if (services.length === 0) {
    return (
      <p className="card" style={{ color: "var(--brand-muted)" }}>
        Aucune prestation n&apos;est réservable en ligne pour le moment.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".65rem" }}>
      {services.map((service) => (
        <li key={service.id}>
          <button
            type="button"
            onClick={() => onChoose(service.id)}
            className="card"
            style={{
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: ".75rem",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 700 }}>{service.name}</span>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {service.priceLabel}
              </span>
            </div>
            <p style={{ margin: ".25rem 0 0", fontSize: ".85rem", color: "var(--brand-muted)" }}>
              {service.durationLabel}
              {service.depositLabel ? ` · acompte ${service.depositLabel}` : ""}
            </p>
            {service.description ? (
              <p style={{ margin: ".6rem 0 0", fontSize: ".88rem", lineHeight: 1.6, color: "var(--brand-muted)" }}>
                {service.description}
              </p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function SlotStep({
  service,
  days,
  activeDate,
  activeDay,
  slot,
  loading,
  error,
  rangeStart,
  today,
  onPickDate,
  onPickSlot,
  onShiftRange,
  onBack,
  onContinue,
}: {
  service: FlowService;
  days: DayDto[];
  activeDate: string | null;
  activeDay: DayDto | null;
  slot: SlotDto | null;
  loading: boolean;
  error: string | null;
  rangeStart: string;
  today: string;
  onPickDate: (date: string) => void;
  onPickSlot: (slot: SlotDto) => void;
  onShiftRange: (direction: "prev" | "next") => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const atStart = rangeStart <= today;

  return (
    <div>
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <p style={{ margin: 0, fontWeight: 700 }}>{service.name}</p>
        <p style={{ margin: ".2rem 0 0", fontSize: ".85rem", color: "var(--brand-muted)" }}>
          {service.durationLabel} · {service.priceLabel}
          {service.depositLabel ? ` · acompte ${service.depositLabel}` : ""}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".5rem",
          marginBottom: ".75rem",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onShiftRange("prev")}
          disabled={atStart || loading}
          style={navButton}
        >
          <span aria-hidden="true">‹</span>
          <span className="visually-hidden">Deux semaines précédentes</span>
        </button>

        <p style={{ margin: 0, fontSize: ".85rem", color: "var(--brand-muted)", flex: 1, textAlign: "center" }}>
          {loading ? "Chargement des disponibilités…" : "Sélectionnez un jour"}
        </p>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onShiftRange("next")}
          disabled={loading}
          style={navButton}
        >
          <span aria-hidden="true">›</span>
          <span className="visually-hidden">Deux semaines suivantes</span>
        </button>
      </div>

      <div
        role="group"
        aria-label="Jours disponibles"
        style={{
          display: "flex",
          gap: ".45rem",
          overflowX: "auto",
          paddingBottom: ".5rem",
          scrollbarWidth: "thin",
        }}
      >
        {days.map((day) => {
          const available = day.slots.length > 0;
          const selected = day.date === activeDate;
          return (
            <button
              key={day.date}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onPickDate(day.date)}
              style={{
                flex: "0 0 auto",
                minWidth: 62,
                padding: ".55rem .35rem",
                borderRadius: 12,
                border: `1px solid ${selected ? "var(--brand-primary)" : "var(--brand-border)"}`,
                background: selected ? "var(--brand-primary)" : "var(--brand-surface)",
                color: selected ? "#fff" : "var(--brand-text)",
                opacity: available ? 1 : 0.38,
                cursor: available ? "pointer" : "not-allowed",
                font: "inherit",
                minHeight: 62,
              }}
            >
              <span style={{ display: "block", fontSize: ".68rem", textTransform: "uppercase" }}>
                {weekdayShort(day.date)}
              </span>
              <span style={{ display: "block", fontSize: "1.05rem", fontWeight: 700 }}>
                {Number(day.date.slice(8, 10))}
              </span>
              <span style={{ display: "block", fontSize: ".62rem" }}>
                {monthShort(day.date)}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "1.25rem", minHeight: 120 }}>
        {error ? (
          <p role="alert" className="card" style={alertStyle}>
            {error}
          </p>
        ) : loading ? (
          <p style={{ color: "var(--brand-muted)" }}>Chargement…</p>
        ) : !activeDay || activeDay.slots.length === 0 ? (
          <p className="card" style={{ color: "var(--brand-muted)", margin: 0 }}>
            Aucun créneau disponible sur cette période. Essayez les deux semaines
            suivantes.
          </p>
        ) : (
          <>
            <p style={{ fontSize: ".85rem", color: "var(--brand-muted)", margin: "0 0 .6rem" }}>
              {longDate(activeDay.date)}
            </p>
            <div className="slot-grid">
              {activeDay.slots.map((candidate) => (
                <button
                  key={candidate.startsAt}
                  type="button"
                  className="slot"
                  aria-pressed={slot?.startsAt === candidate.startsAt}
                  onClick={() => onPickSlot(candidate)}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <StepActions
        onBack={onBack}
        onContinue={onContinue}
        continueDisabled={!slot}
        continueLabel="Continuer"
      />
    </div>
  );
}

function DetailsStep({
  form,
  errors,
  requireEmail,
  onChange,
  onBack,
  onContinue,
}: {
  form: { customerName: string; customerPhone: string; customerEmail: string; customerNote: string };
  errors: Record<string, string>;
  requireEmail: boolean;
  onChange: (field: string, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
      noValidate
    >
      <Field
        id="customerName"
        label="Nom complet"
        value={form.customerName}
        error={errors.customerName}
        autoComplete="name"
        required
        onChange={(value) => onChange("customerName", value)}
      />

      <Field
        id="customerPhone"
        label="Téléphone"
        value={form.customerPhone}
        error={errors.customerPhone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        hint="Pour vous joindre en cas d'imprévu."
        onChange={(value) => onChange("customerPhone", value)}
      />

      <Field
        id="customerEmail"
        label={requireEmail ? "Email" : "Email (facultatif)"}
        value={form.customerEmail}
        error={errors.customerEmail}
        type="email"
        inputMode="email"
        autoComplete="email"
        required={requireEmail}
        hint="Vous y recevrez la confirmation de votre rendez-vous."
        onChange={(value) => onChange("customerEmail", value)}
      />

      <div className="field">
        <label className="label" htmlFor="customerNote">
          Message (facultatif)
        </label>
        <textarea
          id="customerNote"
          className="textarea"
          value={form.customerNote}
          maxLength={1000}
          onChange={(event) => onChange("customerNote", event.target.value)}
        />
      </div>

      <StepActions onBack={onBack} continueType="submit" continueLabel="Continuer" />
    </form>
  );
}

function SummaryStep({
  service,
  slot,
  date,
  form,
  settings,
  submitting,
  onBack,
  onSubmit,
}: {
  service: FlowService;
  slot: SlotDto;
  date: string;
  form: { customerName: string; customerPhone: string; customerEmail: string; customerNote: string };
  settings: FlowSettings;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="card">
        <Row label="Prestation" value={service.name} />
        <Row label="Date" value={longDate(date)} />
        <Row label="Heure" value={`${slot.label} – ${slot.endLabel}`} />
        <Row label="Durée" value={service.durationLabel} />
        <Row label="Prix" value={service.priceLabel} />
        {service.depositLabel ? (
          <Row label="Acompte à envoyer" value={service.depositLabel} highlight />
        ) : null}
      </div>

      <div className="card" style={{ marginTop: ".75rem" }}>
        <Row label="Nom" value={form.customerName} />
        <Row label="Téléphone" value={form.customerPhone} />
        {form.customerEmail ? <Row label="Email" value={form.customerEmail} /> : null}
        {form.customerNote ? <Row label="Message" value={form.customerNote} /> : null}
      </div>

      {service.depositRequired ? (
        <p
          className="card"
          style={{
            marginTop: ".75rem",
            background: "color-mix(in srgb, var(--brand-accent) 26%, var(--brand-surface))",
            fontSize: ".9rem",
            lineHeight: 1.65,
          }}
        >
          Votre créneau est réservé pendant {settings.holdDurationMinutes} minutes.
          À l&apos;étape suivante vous verrez où envoyer l&apos;acompte et vous
          pourrez téléverser votre preuve de paiement. Le rendez-vous est
          définitivement confirmé une fois l&apos;acompte vérifié.
        </p>
      ) : null}

      {settings.bookingTerms ? (
        <p style={{ marginTop: "1rem", fontSize: ".82rem", color: "var(--brand-muted)", lineHeight: 1.65, whiteSpace: "pre-line" }}>
          {settings.bookingTerms}
        </p>
      ) : null}

      {settings.cancellationPolicy ? (
        <p style={{ marginTop: ".5rem", fontSize: ".82rem", color: "var(--brand-muted)", lineHeight: 1.65, whiteSpace: "pre-line" }}>
          {settings.cancellationPolicy}
        </p>
      ) : null}

      <StepActions
        onBack={onBack}
        onContinue={onSubmit}
        continueLabel={submitting ? "Enregistrement…" : "Confirmer ma réservation"}
        continueDisabled={submitting}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Field({
  id,
  label,
  value,
  error,
  hint,
  type = "text",
  inputMode,
  autoComplete,
  required,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  autoComplete?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        className="input"
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: ".5rem 0",
        fontSize: ".92rem",
      }}
    >
      <span style={{ color: "var(--brand-muted)" }}>{label}</span>
      <span
        style={{
          fontWeight: highlight ? 700 : 600,
          textAlign: "right",
          color: highlight ? "var(--brand-primary)" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StepActions({
  onBack,
  onContinue,
  continueLabel,
  continueDisabled,
  continueType = "button",
}: {
  onBack: () => void;
  onContinue?: () => void;
  continueLabel: string;
  continueDisabled?: boolean;
  continueType?: "button" | "submit";
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: ".6rem",
        marginTop: "1.5rem",
        flexWrap: "wrap",
      }}
    >
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        Retour
      </button>
      <button
        type={continueType}
        className="btn btn-primary"
        style={{ flex: 1, minWidth: 180 }}
        onClick={continueType === "button" ? onContinue : undefined}
        disabled={continueDisabled}
      >
        {continueLabel}
      </button>
    </div>
  );
}

const alertStyle: React.CSSProperties = {
  background: "#fbe4e2",
  color: "#8f241c",
  borderColor: "#f1c4c0",
  marginBottom: "1rem",
  fontSize: ".92rem",
  lineHeight: 1.6,
};

const navButton: React.CSSProperties = {
  padding: ".4rem .85rem",
  minHeight: 40,
  fontSize: "1.1rem",
  lineHeight: 1,
};

// --- date helpers (browser-local, display only) -----------------------------

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function maxIso(a: string, b: string): string {
  return a > b ? a : b;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

const WEEKDAYS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MONTHS = [
  "janv",
  "févr",
  "mars",
  "avr",
  "mai",
  "juin",
  "juil",
  "août",
  "sept",
  "oct",
  "nov",
  "déc",
];
const MONTHS_LONG = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const WEEKDAYS_LONG = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

function weekdayShort(iso: string): string {
  return WEEKDAYS[parseIso(iso).getUTCDay()];
}

function monthShort(iso: string): string {
  return MONTHS[parseIso(iso).getUTCMonth()];
}

function longDate(iso: string): string {
  if (!iso) return "";
  const date = parseIso(iso);
  return `${WEEKDAYS_LONG[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
