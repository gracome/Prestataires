import Link from "next/link";
import { Suspense } from "react";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatLocalTime, formatLongDateFr } from "@/lib/time";
import {
  Callout,
  EmptyState,
  PageHeader,
  Section,
  SkeletonTable,
} from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";

const TEMPLATE_LABELS: Record<string, string> = {
  "provider.booking.created": "Nouvelle réservation (vous)",
  "provider.booking.cancelled": "Annulation (vous)",
  "provider.proof.submitted": "Preuve de paiement reçue (vous)",
  "provider.quote.received": "Demande de devis (vous)",
  "customer.booking.awaiting_payment": "Instructions d'acompte (cliente)",
  "customer.booking.confirmed": "Confirmation de rendez-vous (cliente)",
  "customer.payment.rejected": "Acompte refusé (cliente)",
  "customer.booking.expired": "Réservation expirée (cliente)",
  "customer.booking.cancelled": "Annulation (cliente)",
  "customer.reminder": "Rappel de rendez-vous (cliente)",
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "En cours", tone: "pending" },
  SENT: { label: "Envoyé", tone: "success" },
  FAILED: { label: "Échec", tone: "danger" },
  SKIPPED: { label: "Ignoré", tone: "neutral" },
};

export default async function NotificationsPage() {
  const { provider } = await requireSection("notifications");

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Historique des emails envoyés automatiquement à vous et à vos clientes."
      />

      <Suspense
        fallback={
          <Section title="Emails automatiques">
            <SkeletonTable rows={6} />
          </Section>
        }
      >
        <NotificationsContent providerId={provider.id} />
      </Suspense>
    </>
  );
}

async function NotificationsContent({ providerId }: { providerId: string }) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });
  const tz = provider.timezone;

  const [logs, failures] = await Promise.all([
    prisma.notificationLog.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notificationLog.count({
      where: { providerId: provider.id, status: "FAILED" },
    }),
  ]);

  return (
    <>
      {failures > 0 ? (
        <Callout tone="warning">
          {failures} email{failures > 1 ? "s n'ont" : " n'a"} pas pu être
          envoyé{failures > 1 ? "s" : ""}. Vérifiez la configuration d&apos;envoi
          avec l&apos;administrateur de la plateforme.
        </Callout>
      ) : null}

      <Section
        title="Emails automatiques"
        description="Chaque événement de réservation déclenche un email. Les envois sont dédupliqués : un même événement ne peut pas être notifié deux fois."
      >
        {logs.length === 0 ? (
          <EmptyState
            title="Aucun email envoyé pour le moment"
            description="Les notifications apparaîtront ici dès votre première réservation."
          />
        ) : (
          <div className="card table-scroll" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Destinataire</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const status = STATUS_LABELS[log.status] ?? {
                    label: log.status,
                    tone: "neutral",
                  };
                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatLongDateFr(log.createdAt, tz)}
                        <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                          {formatLocalTime(log.createdAt, tz)}
                        </span>
                      </td>
                      <td>
                        {log.appointmentId ? (
                          <Link href={`/dashboard/reservations/${log.appointmentId}`}>
                            {TEMPLATE_LABELS[log.template] ?? log.template}
                          </Link>
                        ) : (
                          (TEMPLATE_LABELS[log.template] ?? log.template)
                        )}
                        {log.subject ? (
                          <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                            {log.subject}
                          </span>
                        ) : null}
                      </td>
                      <td style={{ wordBreak: "break-word" }}>{log.recipient}</td>
                      <td>
                        <span className={`pill pill-${status.tone}`}>{status.label}</span>
                        {log.error ? (
                          <span
                            style={{
                              display: "block",
                              color: "var(--tone-danger-fg)",
                              fontSize: ".78rem",
                              marginTop: ".3rem",
                              maxWidth: 260,
                            }}
                          >
                            {log.error}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Ce qui est envoyé automatiquement">
        <div className="card">
          <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.85, fontSize: ".92rem" }}>
            <li>À vous : nouvelle demande de rendez-vous.</li>
            <li>À vous : preuve de paiement envoyée par une cliente.</li>
            <li>À vous : annulation d&apos;un rendez-vous.</li>
            <li>À vous : nouvelle demande de devis.</li>
            <li>À la cliente : instructions pour envoyer l&apos;acompte.</li>
            <li>À la cliente : rendez-vous confirmé.</li>
            <li>À la cliente : acompte refusé, avec le motif.</li>
            <li>À la cliente : réservation expirée.</li>
            <li>À la cliente : rappel 24 h et 2 h avant le rendez-vous.</li>
          </ul>
        </div>
      </Section>
    </>
  );
}
