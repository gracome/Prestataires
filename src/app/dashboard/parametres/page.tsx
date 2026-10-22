import { cookies } from "next/headers";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { isGoogleConfigured } from "@/lib/google/oauth";
import { formatLocalTime, formatLongDateFr } from "@/lib/time";
import { appUrl, env } from "@/lib/env";
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
import { PaymentGatewayForm } from "@/components/dashboard/PaymentGatewayForm";
import { CustomDomainForm } from "@/components/dashboard/CustomDomainForm";
import { PushToggle } from "@/components/dashboard/PushToggle";
import { publicVapidKey } from "@/lib/notifications/push";
import { sha256 } from "@/lib/crypto";
import { SessionsPanel } from "@/components/dashboard/SessionsPanel";
import { featuresOf } from "@/lib/auth/features";

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

  const [settings, connection, gateway] = await Promise.all([
    prisma.bookingSettings.findUnique({ where: { providerId: provider.id } }),
    prisma.calendarConnection.findUnique({ where: { providerId: provider.id } }),
    prisma.paymentGatewayAccount.findUnique({ where: { providerId: provider.id } }),
  ]);

  const features = featuresOf(provider);

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

      {features.has("ONLINE_PAYMENT") ? (
        <Section
          title="Paiement en ligne"
          description="Vos clientes règlent leur acompte par carte ou mobile money, directement sur votre compte FedaPay."
        >
          <PaymentGatewayForm
            webhookUrl={appUrl(`/api/payments/fedapay/${provider.id}`)}
            account={
              gateway
                ? {
                    mode: gateway.mode,
                    publicKey: gateway.publicKey,
                    enabled: gateway.enabled,
                    hasWebhookSecret: gateway.webhookSecretEncrypted !== null,
                    lastError: gateway.lastError,
                  }
                : null
            }
          />
        </Section>
      ) : null}

      {features.has("CUSTOM_DOMAIN") ? (
        <Section
          title="Domaine personnalisé"
          description="Servez votre site sur votre propre adresse plutôt que sur celle de la plateforme."
        >
          <CustomDomainForm
            domain={provider.customDomain}
            platformHost={new URL(appUrl("/")).host}
          />
        </Section>
      ) : null}
      <Section
        title="Notifications sur votre téléphone"
        description="Soyez prévenue immédiatement, sans attendre un email."
      >
        <PushToggle vapidPublicKey={publicVapidKey()} />
      </Section>
      <Section title="Mot de passe">
        <PasswordForm />
      </Section>

      <Section
        title="Vos appareils connectés"
        description="Une session se ferme toute seule après 12 heures sans activité, et au plus tard au bout de 7 jours. Si vous avez laissé votre compte ouvert quelque part, fermez-le ici sans attendre."
      >
        <Devices userId={user.id} timezone={provider.timezone} />
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

/**
 * Her open sessions, newest first.
 *
 * The current one is marked rather than hidden: a list she cannot find herself
 * in is a list she has no reason to trust.
 *
 * The user agent is reduced to something a person can recognise — "Chrome sur
 * Android" — because the raw string is a paragraph of version numbers and she
 * is being asked to spot an intruder in it.
 */
async function Devices({
  userId,
  timezone,
}: {
  userId: string;
  timezone: string;
}) {
  const store = await cookies();
  const token = store.get(env().SESSION_COOKIE_NAME)?.value;
  const currentHash = token ? sha256(token) : null;

  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
    select: {
      id: true,
      tokenHash: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  const idleMs = env().SESSION_IDLE_HOURS * 3_600_000;
  const live = sessions.filter(
    (session) => now.getTime() - session.lastSeenAt.getTime() <= idleMs,
  );

  if (live.length === 0) {
    return (
      <EmptyState
        title="Aucune session ouverte"
        description="Rien à fermer pour le moment."
      />
    );
  }

  const when = (date: Date) =>
    `${formatLongDateFr(date, timezone)} à ${formatLocalTime(date, timezone)}`;

  return (
    <SessionsPanel
      sessions={live.map((session) => ({
        id: session.id,
        current: currentHash !== null && session.tokenHash === currentHash,
        device: describeDevice(session.userAgent),
        ipAddress: session.ipAddress,
        signedIn: when(session.createdAt),
        lastSeen: when(session.lastSeenAt),
      }))}
    />
  );
}

/** "Chrome sur Android", from a paragraph of version numbers. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu";

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\/|Opera/.test(userAgent) ? "Opera"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Navigateur";

  const system =
    /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent) ? "iPhone ou iPad"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS X/.test(userAgent) ? "Mac"
    : /Linux/.test(userAgent) ? "Linux"
    : null;

  return system ? `${browser} sur ${system}` : browser;
}
