import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import {
  formatDurationFr,
  formatLocalTime,
  formatLongDateFr,
  minutesBetween,
} from "@/lib/time";
import { statusLabelFr } from "@/lib/booking/state-machine";
import { PageHeader, Section, StatusPill, Callout } from "@/components/dashboard/ui";
import { AppointmentActions } from "@/components/dashboard/AppointmentActions";
import { appUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { provider } = await requireSection("bookings");

  const appointment = await prisma.appointment.findFirst({
    // Scoping by providerId in the query itself means another tenant's id
    // simply does not resolve.
    where: { id, providerId: provider.id },
    include: {
      service: true,
      paymentProofs: { orderBy: { submittedAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!appointment) notFound();

  const tz = provider.timezone;
  const now = new Date();
  const currentProof = appointment.paymentProofs.find((p) => p.status === "SUBMITTED");
  const minutesLeft = appointment.expiresAt
    ? minutesBetween(now, appointment.expiresAt)
    : null;

  return (
    <>
      <Link
        href="/dashboard/reservations"
        style={{ fontSize: ".88rem", display: "inline-block", marginBottom: "1rem" }}
      >
        ← Toutes les réservations
      </Link>

      <PageHeader
        title={appointment.customerName}
        description={`${appointment.service.name} · ${formatLongDateFr(appointment.startsAt, tz)} à ${formatLocalTime(appointment.startsAt, tz)}`}
        action={<StatusPill status={appointment.status} />}
      />

      {appointment.status === "PAYMENT_PROOF_SUBMITTED" && minutesLeft !== null ? (
        <Callout tone={minutesLeft < 30 ? "danger" : "warning"}>
          {minutesLeft > 0
            ? `Sans vérification de votre part sous ${formatDurationFr(minutesLeft)}, la réservation expirera et le créneau sera libéré.`
            : "Le délai de vérification est dépassé : la réservation va expirer."}
        </Callout>
      ) : null}

      {appointment.status === "AWAITING_PAYMENT" && minutesLeft !== null ? (
        <Callout tone="info">
          En attente de la preuve de paiement de la cliente
          {minutesLeft > 0 ? ` (encore ${formatDurationFr(minutesLeft)})` : ""}.
        </Callout>
      ) : null}

      <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr" }}>
        <Section title="Rendez-vous">
          <div className="card">
            <Row label="Prestation" value={appointment.service.name} />
            <Row label="Date" value={formatLongDateFr(appointment.startsAt, tz)} />
            <Row
              label="Heure"
              value={`${formatLocalTime(appointment.startsAt, tz)} – ${formatLocalTime(appointment.serviceEndsAt, tz)}`}
            />
            <Row label="Durée" value={formatDurationFr(appointment.service.durationMinutes)} />
            <Row label="Référence" value={appointment.reference} />
            <Row
              label="Réservé le"
              value={`${formatLongDateFr(appointment.createdAt, tz)} à ${formatLocalTime(appointment.createdAt, tz)}`}
            />
            {appointment.googleEventId ? (
              <Row label="Google Calendar" value="Événement synchronisé" />
            ) : null}
          </div>
        </Section>

        <Section title="Cliente">
          <div className="card">
            <Row label="Nom" value={appointment.customerName} />
            <Row
              label="Téléphone"
              value={appointment.customerPhone}
              href={`tel:${appointment.customerPhone.replace(/[^0-9+]/g, "")}`}
            />
            {appointment.customerEmail ? (
              <Row
                label="Email"
                value={appointment.customerEmail}
                href={`mailto:${appointment.customerEmail}`}
              />
            ) : null}
            {appointment.customerNote ? (
              <div style={{ paddingTop: ".75rem", borderTop: "1px solid var(--admin-border)", marginTop: ".5rem" }}>
                <p style={{ margin: 0, fontSize: ".8rem", color: "var(--admin-muted)" }}>
                  Message de la cliente
                </p>
                <p style={{ margin: ".35rem 0 0", lineHeight: 1.65, whiteSpace: "pre-line" }}>
                  {appointment.customerNote}
                </p>
              </div>
            ) : null}
          </div>
        </Section>

        <Section title="Paiement">
          <div className="card">
            <Row
              label="Montant total"
              value={formatMoney(appointment.totalAmount, appointment.currency, provider.locale)}
            />
            {appointment.depositAmount > 0 ? (
              <>
                <Row
                  label="Acompte demandé"
                  value={formatMoney(appointment.depositAmount, appointment.currency, provider.locale)}
                />
                <Row
                  label="Solde sur place"
                  value={formatMoney(appointment.balanceAmount, appointment.currency, provider.locale)}
                />
              </>
            ) : (
              <Row label="Acompte" value="Aucun acompte demandé" />
            )}
            <Row label="Méthode de validation" value={validationLabel(appointment.validationMethod)} />
            {appointment.paymentSubmittedAt ? (
              <Row
                label="Preuve reçue le"
                value={`${formatLongDateFr(appointment.paymentSubmittedAt, tz)} à ${formatLocalTime(appointment.paymentSubmittedAt, tz)}`}
              />
            ) : null}
            {appointment.paymentVerifiedAt ? (
              <Row
                label="Vérifiée le"
                value={`${formatLongDateFr(appointment.paymentVerifiedAt, tz)} à ${formatLocalTime(appointment.paymentVerifiedAt, tz)}`}
              />
            ) : null}
            {appointment.paymentRejectionReason ? (
              <Row label="Motif du refus" value={appointment.paymentRejectionReason} />
            ) : null}
          </div>
        </Section>

        {appointment.paymentProofs.length > 0 ? (
          <Section title="Preuves de paiement">
            <div style={{ display: "grid", gap: ".75rem" }}>
              {appointment.paymentProofs.map((proof) => (
                <div key={proof.id} className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: ".75rem",
                      flexWrap: "wrap",
                      marginBottom: ".75rem",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: ".9rem" }}>
                      Envoyée le {formatLongDateFr(proof.submittedAt, tz)} à{" "}
                      {formatLocalTime(proof.submittedAt, tz)}
                    </span>
                    <span className={`pill pill-${proofTone(proof.status)}`}>
                      {proofLabel(proof.status)}
                    </span>
                  </div>

                  {proof.mimeType.startsWith("image/") ? (
                    <a href={`/api/proofs/${proof.id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/proofs/${proof.id}`}
                        alt={`Preuve de paiement envoyée le ${formatLongDateFr(proof.submittedAt, tz)}`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 420,
                          borderRadius: 10,
                          border: "1px solid var(--admin-border)",
                          display: "block",
                        }}
                      />
                    </a>
                  ) : (
                    <a
                      href={`/api/proofs/${proof.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: ".5rem 1rem", minHeight: 38, fontSize: ".85rem" }}
                    >
                      Ouvrir le document ({proof.originalName})
                    </a>
                  )}

                  {proof.rejectionReason ? (
                    <p style={{ margin: ".75rem 0 0", fontSize: ".85rem", color: "var(--tone-danger-fg)" }}>
                      Motif du refus : {proof.rejectionReason}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Actions">
          <AppointmentActions
            appointmentId={appointment.id}
            status={appointment.status}
            hasCurrentProof={Boolean(currentProof)}
            providerNote={appointment.providerNote ?? ""}
            customerLink={appUrl(`/reservation/${appointment.accessToken}`)}
          />
        </Section>

        <Section title="Historique">
          <div className="card">
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {appointment.events.map((event) => (
                <li
                  key={event.id}
                  style={{
                    padding: ".6rem 0",
                    borderBottom: "1px solid var(--admin-border)",
                    fontSize: ".88rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600 }}>{statusLabelFr(event.toStatus)}</span>
                    <span style={{ color: "var(--admin-muted)", fontSize: ".82rem" }}>
                      {formatLongDateFr(event.createdAt, tz)} à{" "}
                      {formatLocalTime(event.createdAt, tz)}
                    </span>
                  </div>
                  <p style={{ margin: ".2rem 0 0", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                    {actorLabel(event.actor)}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
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
      <span style={{ color: "var(--admin-muted)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
        {href ? <a href={href}>{value}</a> : value}
      </span>
    </div>
  );
}

function validationLabel(method: string): string {
  switch (method) {
    case "NO_DEPOSIT":
      return "Sans acompte";
    case "MANUAL_PAYMENT":
      return "Acompte manuel, preuve vérifiée";
    case "ONLINE_PAYMENT":
      return "Paiement en ligne";
    default:
      return method;
  }
}

function proofLabel(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "À vérifier";
    case "ACCEPTED":
      return "Acceptée";
    case "REJECTED":
      return "Refusée";
    default:
      return "Remplacée";
  }
}

function proofTone(status: string): string {
  switch (status) {
    case "SUBMITTED":
      return "action";
    case "ACCEPTED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function actorLabel(actor: string): string {
  switch (actor) {
    case "customer":
      return "Cliente";
    case "provider":
      return "Vous";
    case "system":
      return "Système";
    default:
      return actor;
  }
}
