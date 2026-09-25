import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { formatLocalTime, formatLongDateFr } from "@/lib/time";
import { appUrl } from "@/lib/env";
import { Callout, EmptyState, PageHeader, Section } from "@/components/dashboard/ui";
import { supportVisits } from "@/lib/platform/overview";
import { TeamPanel } from "@/components/dashboard/TeamPanel";
import { MAX_ACCOUNTS_PER_PROVIDER } from "@/lib/auth/permissions";
import {
  BookingSettingsForm,
  GoogleCalendarPanel,
  PasswordForm,
  SiteStatusPanel,
} from "@/components/dashboard/SettingsForms";

export const dynamic = "force-dynamic";

const GOOGLE_MESSAGES: Record<string, { tone: "success" | "danger"; text: string }> = {
  connecte: { tone: "success", text: "Google Calendar est connecté." },
  "acces-refuse": {
    tone: "danger",
    text: "La connexion a été refusée dans Google. Rien n'a été enregistré.",
  },
  "etat-invalide": {
    tone: "danger",
    text: "La connexion a expiré ou a été interrompue. Relancez-la depuis cette page.",
  },
  echec: {
    tone: "danger",
    text: "La connexion a échoué. Vérifiez que vous autorisez bien l'accès au calendrier, puis réessayez.",
  },
};

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { provider, user } = await requireSection("settings");
  const { google } = await searchParams;

  const [settings, connection] = await Promise.all([
    prisma.bookingSettings.findUnique({ where: { providerId: provider.id } }),
    prisma.calendarConnection.findUnique({ where: { providerId: provider.id } }),
  ]);

  const notice = google ? GOOGLE_MESSAGES[google] : undefined;

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Règles de réservation, calendrier et sécurité de votre compte."
      />

      {notice ? <Callout tone={notice.tone}>{notice.text}</Callout> : null}

      <Section
        title="Statut du site"
        description={`Adresse publique : ${appUrl(`/${provider.slug}`)}`}
      >
        <SiteStatusPanel status={provider.status} />
      </Section>

      <Section
        title="Règles de réservation"
        description="Ces réglages décident des créneaux proposés et du temps laissé pour l'acompte."
      >
        <BookingSettingsForm
          googleConnected={Boolean(connection)}
          values={{
            bookingEnabled: settings?.bookingEnabled ?? true,
            slotGranularityMinutes: settings?.slotGranularityMinutes ?? 30,
            bufferAfterMinutes: settings?.bufferAfterMinutes ?? 0,
            minLeadTimeMinutes: settings?.minLeadTimeMinutes ?? 120,
            maxAdvanceDays: settings?.maxAdvanceDays ?? 60,
            holdDurationMinutes: settings?.holdDurationMinutes ?? 30,
            proofDeadlineMinutes: settings?.proofDeadlineMinutes ?? 30,
            verificationDeadlineMinutes: settings?.verificationDeadlineMinutes ?? 120,
            syncToGoogleCalendar: settings?.syncToGoogleCalendar ?? true,
            blockOnGoogleBusy: settings?.blockOnGoogleBusy ?? true,
            requireCustomerEmail: settings?.requireCustomerEmail ?? true,
            allowCustomerCancellation: settings?.allowCustomerCancellation ?? true,
            cancellationNoticeHours: settings?.cancellationNoticeHours ?? 24,
            cancellationPolicy: settings?.cancellationPolicy ?? "",
            bookingTerms: settings?.bookingTerms ?? "",
          }}
        />
      </Section>

      <Section
        title="Google Calendar"
        description="Vos rendez-vous confirmés sont ajoutés à votre agenda, et vos occupations personnelles bloquent les créneaux."
      >
        <GoogleCalendarPanel
          configured={isGoogleConfigured()}
          connected={Boolean(connection)}
          account={connection?.googleAccount ?? null}
          lastSyncedAt={
            connection?.lastSyncedAt
              ? `${formatLongDateFr(connection.lastSyncedAt, provider.timezone)} à ${formatLocalTime(connection.lastSyncedAt, provider.timezone)}`
              : null
          }
          lastSyncError={connection?.lastSyncError ?? null}
        />
      </Section>

      <Section title="Mot de passe">
        <PasswordForm />
      </Section>

      <Section
        title="Qui a accès à cet espace"
        description={`Vous pouvez donner un compte à ${MAX_ACCOUNTS_PER_PROVIDER - 1} personnes qui travaillent avec vous. Elles gèrent les rendez-vous, le calendrier, les prestations, les horaires, la galerie et les devis, sans voir vos chiffres ni vos coordonnées bancaires.`}
      >
        <Team providerId={provider.id} currentUserId={user.id} timezone={provider.timezone} />
      </Section>

      <Section
        title="Accès de la plateforme"
        description="Quand l'équipe de la plateforme ouvre une session sur votre compte pour vous aider, c'est écrit ici. Personne ne peut lire vos données sans laisser cette trace."
      >
        <SupportVisits providerId={provider.id} timezone={provider.timezone} />
      </Section>
    </>
  );
}

async function Team({
  providerId,
  currentUserId,
  timezone,
}: {
  providerId: string;
  currentUserId: string;
  timezone: string;
}) {
  const users = await prisma.user.findMany({
    where: { providerId },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
    // The owner first, then the team, each group oldest first.
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <TeamPanel
      timezone={timezone}
      members={users.map((row) => ({ ...row, isSelf: row.id === currentUserId }))}
    />
  );
}

/**
 * The other half of the promise made in the platform area: an administrator
 * can borrow this account for support, and the provider is told every time.
 */
async function SupportVisits({
  providerId,
  timezone,
}: {
  providerId: string;
  timezone: string;
}) {
  const visits = await supportVisits({ providerId }, 10);

  if (visits.length === 0) {
    return (
      <EmptyState
        title="Personne n'est entré dans votre compte"
        description="Vous verrez ici le nom et la date de chaque intervention."
      />
    );
  }

  const when = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: timezone,
  });

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".6rem" }}>
      {visits.map((visit) => (
        <li key={visit.id} className="card">
          <p style={{ margin: 0, fontWeight: 700 }}>{visit.adminName}</p>
          <p style={{ margin: ".25rem 0 0", fontSize: ".85rem", color: "var(--admin-muted)" }}>
            {when.format(visit.startedAt)} ·{" "}
            {visit.endedAt ? "session terminée" : "session close ou expirée"}
          </p>
        </li>
      ))}
    </ul>
  );
}
