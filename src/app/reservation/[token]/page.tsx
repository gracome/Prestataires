import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  canCustomerCancel,
  canSubmitProof,
  getBookingByToken,
} from "@/lib/booking/customer-view";
import { statusLabelFr, statusTone } from "@/lib/booking/state-machine";
import { formatMoney } from "@/lib/money";
import {
  formatDurationFr,
  formatLocalTime,
  formatLongDateFr,
  minutesBetween,
} from "@/lib/time";
import { googleFontsHref, themeStyle } from "@/lib/theme";
import { whatsappLink } from "@/lib/providers/public-site";
import { ProofUpload } from "@/components/booking/ProofUpload";
import { CancelBooking } from "@/components/booking/CancelBooking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre réservation",
  // The page is reachable only with the token, so it must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default async function CustomerBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await getBookingByToken(token);

  if (!booking) notFound();

  const { provider, service } = booking;
  const tz = provider.timezone;
  const now = new Date();
  const fonts = googleFontsHref(provider.theme);

  const awaitingProof = canSubmitProof(booking, now);
  const minutesLeft = booking.expiresAt
    ? Math.max(0, minutesBetween(now, booking.expiresAt))
    : null;

  const latestProof = booking.paymentProofs[0] ?? null;
  const whatsapp = whatsappLink(provider);

  return (
    <div style={{ ...themeStyle(provider.theme), minHeight: "100dvh" }}>
      {fonts ? <link rel="stylesheet" href={fonts} /> : null}

      <div className="container-narrow" style={{ paddingBlock: "2rem 3rem" }}>
        <Link
          href={`/${provider.slug}`}
          style={{
            display: "inline-block",
            marginBottom: "1.5rem",
            textDecoration: "none",
            color: "var(--brand-muted)",
            fontSize: ".9rem",
          }}
        >
          ← {provider.businessName}
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".75rem",
            flexWrap: "wrap",
            marginBottom: ".75rem",
          }}
        >
          <span className={`pill pill-${statusTone(booking.status)}`}>
            {statusLabelFr(booking.status)}
          </span>
          <span style={{ fontSize: ".82rem", color: "var(--brand-muted)" }}>
            Référence {booking.reference}
          </span>
        </div>

        <h1 className="font-display" style={{ fontSize: "1.75rem", margin: "0 0 1.25rem" }}>
          {headline(booking.status)}
        </h1>

        <section className="card" aria-label="Détail du rendez-vous">
          <Row label="Prestation" value={service.name} />
          <Row label="Date" value={formatLongDateFr(booking.startsAt, tz)} />
          <Row
            label="Heure"
            value={`${formatLocalTime(booking.startsAt, tz)} – ${formatLocalTime(booking.serviceEndsAt, tz)}`}
          />
          <Row label="Durée" value={formatDurationFr(service.durationMinutes)} />
          {booking.totalAmount > 0 ? (
            <Row
              label="Montant total"
              value={formatMoney(booking.totalAmount, booking.currency, provider.locale)}
            />
          ) : null}
          {booking.depositAmount > 0 ? (
            <>
              <Row
                label="Acompte"
                value={formatMoney(booking.depositAmount, booking.currency, provider.locale)}
                highlight
              />
              <Row
                label="Solde sur place"
                value={formatMoney(booking.balanceAmount, booking.currency, provider.locale)}
              />
            </>
          ) : null}
        </section>

        {booking.status === "CONFIRMED" ? (
          <section className="card" style={{ marginTop: ".75rem" }}>
            <h2 style={sectionHeading}>Informations pratiques</h2>
            {provider.addressLine || provider.city ? (
              <p style={{ margin: "0 0 .75rem", lineHeight: 1.7 }}>
                {[provider.addressLine, provider.city].filter(Boolean).join(", ")}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {provider.mapsUrl ? (
                <a
                  href={provider.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={smallButton}
                >
                  Itinéraire
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={smallButton}
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        {awaitingProof ? (
          <section className="card" style={{ marginTop: ".75rem" }}>
            <h2 style={sectionHeading}>Envoyez votre acompte</h2>

            <p style={{ lineHeight: 1.7, color: "var(--brand-muted)", marginTop: 0 }}>
              Votre créneau est réservé
              {minutesLeft !== null
                ? ` encore ${formatDurationFr(minutesLeft)}`
                : ""}
              . Effectuez le dépôt de{" "}
              <strong style={{ color: "var(--brand-text)" }}>
                {formatMoney(booking.depositAmount, booking.currency, provider.locale)}
              </strong>{" "}
              puis envoyez votre capture d&apos;écran ci-dessous.
            </p>

            {provider.paymentInstructions.length === 0 ? (
              <p style={{ color: "#8f241c" }}>
                Les informations de paiement ne sont pas encore renseignées.
                Contactez directement {provider.businessName}.
              </p>
            ) : (
              <div style={{ display: "grid", gap: ".6rem" }}>
                {provider.paymentInstructions.map((instruction) => (
                  <div
                    key={instruction.id}
                    style={{
                      border: "1px solid var(--brand-border)",
                      borderRadius: 12,
                      padding: ".9rem 1rem",
                      background:
                        "color-mix(in srgb, var(--brand-accent) 18%, var(--brand-surface))",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700 }}>{instruction.paymentMethod}</p>
                    <p
                      style={{
                        margin: ".35rem 0 0",
                        fontSize: "1.15rem",
                        fontWeight: 700,
                        letterSpacing: ".02em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {instruction.accountNumber}
                    </p>
                    <p style={{ margin: ".15rem 0 0", fontSize: ".9rem", color: "var(--brand-muted)" }}>
                      Nom : {instruction.accountName}
                    </p>
                    {instruction.instructions ? (
                      <p
                        style={{
                          margin: ".6rem 0 0",
                          fontSize: ".88rem",
                          lineHeight: 1.6,
                          color: "var(--brand-muted)",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {instruction.instructions}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "1.25rem" }}>
              <ProofUpload token={token} />
            </div>
          </section>
        ) : null}

        {booking.status === "PAYMENT_PROOF_SUBMITTED" ? (
          <section className="card" style={{ marginTop: ".75rem" }}>
            <h2 style={sectionHeading}>Preuve envoyée</h2>
            <p style={{ lineHeight: 1.7, color: "var(--brand-muted)", margin: 0 }}>
              Votre preuve de paiement a bien été reçue
              {latestProof
                ? ` le ${formatLongDateFr(latestProof.submittedAt, tz)} à ${formatLocalTime(latestProof.submittedAt, tz)}`
                : ""}
              . {provider.businessName} vérifie le paiement et vous recevrez un
              email dès que le rendez-vous est confirmé.
            </p>
          </section>
        ) : null}

        {booking.status === "PAYMENT_REJECTED" ? (
          <section className="card" style={{ marginTop: ".75rem", borderColor: "#f1c4c0" }}>
            <h2 style={sectionHeading}>Acompte non validé</h2>
            <p style={{ lineHeight: 1.7, color: "var(--brand-muted)", marginTop: 0 }}>
              {booking.paymentRejectionReason
                ? `Motif : ${booking.paymentRejectionReason}`
                : "L'acompte n'a pas pu être validé."}{" "}
              Le créneau a été remis à disposition.
            </p>
            <Link href={`/${provider.slug}/reservation`} className="btn btn-primary" style={smallButton}>
              Réserver un nouveau créneau
            </Link>
          </section>
        ) : null}

        {booking.status === "EXPIRED" ? (
          <section className="card" style={{ marginTop: ".75rem" }}>
            <h2 style={sectionHeading}>Réservation expirée</h2>
            <p style={{ lineHeight: 1.7, color: "var(--brand-muted)", marginTop: 0 }}>
              Le délai de confirmation a été dépassé et le créneau est de nouveau
              disponible pour d&apos;autres clientes.
            </p>
            <Link href={`/${provider.slug}/reservation`} className="btn btn-primary" style={smallButton}>
              Réserver un nouveau créneau
            </Link>
          </section>
        ) : null}

        {canCustomerCancel(booking, now) ? (
          <div style={{ marginTop: "1.5rem" }}>
            <CancelBooking token={token} />
          </div>
        ) : null}

        <p style={{ marginTop: "2rem", fontSize: ".8rem", color: "var(--brand-muted)", lineHeight: 1.6 }}>
          Conservez ce lien : il vous permet de revenir à tout moment sur votre
          réservation. Ne le partagez pas.
        </p>
      </div>
    </div>
  );
}

function headline(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Votre rendez-vous est confirmé";
    case "PAYMENT_PROOF_SUBMITTED":
      return "Votre preuve est en cours de vérification";
    case "PAYMENT_REJECTED":
      return "Votre réservation n'a pas pu être confirmée";
    case "EXPIRED":
      return "Votre réservation a expiré";
    case "CANCELLED":
      return "Votre rendez-vous a été annulé";
    case "COMPLETED":
      return "Merci de votre visite";
    default:
      return "Votre réservation est en attente de l'acompte";
  }
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
        fontSize: ".93rem",
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

const sectionHeading: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 .75rem",
};

const smallButton: React.CSSProperties = {
  padding: ".55rem 1.1rem",
  minHeight: 40,
  fontSize: ".88rem",
};
