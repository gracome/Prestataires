import type { BillingPeriod, Plan, PlanFeature, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email/mailer";
import { renderEmail } from "@/lib/email/layout";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { monthsInPeriod, planLabel, priceFor } from "./catalogue";

/**
 * The subscription lifecycle.
 *
 * Money is collected outside the application — mobile money, cash, transfer —
 * so nothing here charges anyone. What it does is keep the consequences of
 * payment and non-payment automatic: a period that is recorded extends access,
 * and a period that lapses withdraws it without anybody remembering to.
 */

/** How long before expiry the provider is warned. */
const NOTICE_DAYS = 7;

const DAY_MS = 86_400_000;

export function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);

  // 31 January plus one month is 3 March by default, which would quietly gift
  // two days every time. Clamp to the last day of the intended month instead.
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }
  return result;
}

/**
 * Record a payment and extend the paid period.
 *
 * A renewal paid early extends from the current end date rather than from
 * today, so paying ahead never costs the days already bought. A renewal paid
 * late starts from today: an account that lapsed in March and pays in June is
 * not owed March to June.
 */
export async function recordSubscriptionPayment(input: {
  providerId: string;
  plan: Plan;
  billingPeriod: BillingPeriod;
  extraModules: PlanFeature[];
  amount?: number;
  method?: "CASH" | "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER" | "OTHER";
  note?: string;
  recordedById?: string;
  now?: Date;
  client?: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
}): Promise<{ periodEndsAt: Date; amount: number }> {
  const db = input.client ?? prisma;
  const now = input.now ?? new Date();

  const provider = await db.provider.findUniqueOrThrow({
    where: { id: input.providerId },
    select: { currency: true, subscriptionEndsAt: true },
  });

  const startFrom =
    provider.subscriptionEndsAt && provider.subscriptionEndsAt > now
      ? provider.subscriptionEndsAt
      : now;

  const periodEndsAt = addMonths(startFrom, monthsInPeriod(input.billingPeriod));
  const amount =
    input.amount ??
    priceFor(input.plan, input.billingPeriod, input.extraModules);

  await db.subscriptionPayment.create({
    data: {
      providerId: input.providerId,
      amount,
      currency: provider.currency,
      plan: input.plan,
      billingPeriod: input.billingPeriod,
      periodEndsAt,
      method: input.method ?? "MOBILE_MONEY",
      note: input.note,
      recordedById: input.recordedById,
    },
  });

  await db.provider.update({
    where: { id: input.providerId },
    data: {
      plan: input.plan,
      billingPeriod: input.billingPeriod,
      extraModules: input.extraModules,
      subscriptionEndsAt: periodEndsAt,
      // A fresh period deserves a fresh warning later on.
      renewalNoticeSentAt: null,
      // Paying brings a suspended account back, but never promotes a draft:
      // an account still being set up stays a draft until someone publishes it.
      ...(await shouldReactivate(db, input.providerId) ? { status: "ACTIVE" as const } : {}),
    },
  });

  return { periodEndsAt, amount };
}

async function shouldReactivate(
  db: Pick<PrismaClient, "provider">,
  providerId: string,
): Promise<boolean> {
  const current = await db.provider.findUniqueOrThrow({
    where: { id: providerId },
    select: { status: true },
  });
  return current.status === "SUSPENDED";
}

/**
 * Suspend the accounts whose paid period has run out.
 *
 * Suspension is the existing lever: it already removes the provider from the
 * public site, the availability engine and every booking route. Sessions are
 * closed too, so an open tab stops being a way in.
 *
 * Providers with no end date are left alone. That is a trial, or an account
 * being set up, and chasing it for payment would be wrong.
 */
export async function suspendLapsedSubscriptions(now: Date): Promise<number> {
  const lapsed = await prisma.provider.findMany({
    where: {
      status: "ACTIVE",
      subscriptionEndsAt: { not: null, lt: now },
    },
    select: { id: true },
    take: 200,
  });

  if (lapsed.length === 0) return 0;

  const ids = lapsed.map((provider) => provider.id);

  await prisma.$transaction([
    prisma.provider.updateMany({
      where: { id: { in: ids } },
      data: { status: "SUSPENDED" },
    }),
    prisma.session.deleteMany({ where: { user: { providerId: { in: ids } } } }),
  ]);

  return ids.length;
}

/**
 * Warn the providers whose period ends within the week.
 *
 * Sent once per period: renewalNoticeSentAt is cleared when a payment extends
 * the period, so the next warning belongs to the next period and this one is
 * not repeated every five minutes.
 */
export async function sendRenewalNotices(
  now: Date,
  errors: string[],
): Promise<number> {
  const horizon = new Date(now.getTime() + NOTICE_DAYS * DAY_MS);

  const due = await prisma.provider.findMany({
    where: {
      status: "ACTIVE",
      renewalNoticeSentAt: null,
      subscriptionEndsAt: { not: null, gte: now, lte: horizon },
    },
    select: {
      id: true,
      email: true,
      businessName: true,
      ownerName: true,
      currency: true,
      plan: true,
      billingPeriod: true,
      extraModules: true,
      subscriptionEndsAt: true,
    },
    take: 100,
  });

  let sent = 0;

  for (const provider of due) {
    const endsAt = provider.subscriptionEndsAt;
    if (!endsAt) continue;

    const amount = priceFor(
      provider.plan,
      provider.billingPeriod,
      provider.extraModules,
    );

    const { html, text } = renderEmail({
      title: "Votre abonnement arrive à échéance",
      preheader: `Formule ${planLabel(provider.plan)} — à renouveler avant le ${formatDate(endsAt)}.`,
      businessName: provider.businessName,
      blocks: [
        { kind: "paragraph", text: `Bonjour ${provider.ownerName},` },
        {
          kind: "paragraph",
          text:
            "Votre abonnement arrive à échéance. Sans renouvellement, votre " +
            "site et vos réservations en ligne seront suspendus à cette date.",
        },
        {
          kind: "facts",
          rows: [
            ["Formule", planLabel(provider.plan)],
            [
              "Échéance",
              formatDate(endsAt),
            ],
            [
              "Montant",
              `${formatMoney(amount, provider.currency)} / ${
                provider.billingPeriod === "YEARLY" ? "an" : "mois"
              }`,
            ],
          ],
        },
        {
          kind: "paragraph",
          text: "Vos données sont conservées : un règlement rétablit tout en l'état.",
        },
        { kind: "button", label: "Ouvrir mon espace", url: appUrl("/dashboard") },
      ],
    });

    const result = await sendMail({
      to: provider.email,
      subject: "Votre abonnement arrive à échéance",
      html,
      text,
    });

    if (result.ok) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: { renewalNoticeSentAt: now },
      });
      sent += 1;
    } else {
      errors.push(`renewal notice: ${result.error ?? "échec inconnu"}`);
    }
  }

  return sent;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
