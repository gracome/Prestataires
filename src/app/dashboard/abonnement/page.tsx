import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatLongDateFr } from "@/lib/time";
import { PLAN_ORDER, PLANS, planLabel, priceFor } from "@/lib/plans/catalogue";
import { onlineSubscriptionPaymentAvailable, settleSubscriptionCheckout } from "@/lib/plans/checkout";
import { CONTACT } from "@/lib/marketing/product";
import { Callout, PageHeader, Section } from "@/components/dashboard/ui";
import { PlanPicker, type PlanOption } from "@/components/dashboard/PlanPicker";

export const dynamic = "force-dynamic";

/**
 * Her subscription: where it stands, and paying for the next period.
 *
 * Reachable while suspended, on purpose. A lapsed account loses its public
 * site, not its owner's access: this page is how she brings it back.
 */
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string; ref?: string }>;
}) {
  const { provider } = await requireSection("subscription");
  const { paiement, ref } = await searchParams;

  // Back from FedaPay. The webhook is the reliable path; this settles it at
  // once when the webhook is late, so she never sees a page still asking her
  // to pay for what she just paid.
  let returned: "paid" | "failed" | "pending" | null = null;
  if (paiement === "retour" && ref) {
    const owned = await prisma.subscriptionCheckout.findFirst({
      where: { id: ref, providerId: provider.id },
      select: { id: true },
    });
    if (owned) {
      const outcome = await settleSubscriptionCheckout({ id: owned.id });
      returned = outcome === "paid" || outcome === "already-paid" ? "paid" : outcome === "failed" ? "failed" : "pending";
    }
  }

  // Read after settling, so a payment just recorded shows in the dates.
  const [current, payments] = await Promise.all([
    prisma.provider.findUniqueOrThrow({
      where: { id: provider.id },
      select: {
        status: true,
        plan: true,
        billingPeriod: true,
        subscriptionEndsAt: true,
        extraModules: true,
        currency: true,
        timezone: true,
      },
    }),
    prisma.subscriptionPayment.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);

  const online = onlineSubscriptionPaymentAvailable();
  const trial = payments.length === 0;
  const money = (amount: number) => formatMoney(amount, current.currency);
  const endsAt = current.subscriptionEndsAt;
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000) : null;

  const plans: PlanOption[] = PLAN_ORDER.map((id) => {
    const monthly = priceFor(id, "MONTHLY", current.extraModules);
    const yearly = priceFor(id, "YEARLY", current.extraModules);
    const saving = monthly * 12 - yearly;
    return {
      id,
      name: PLANS[id].name,
      emoji: PLANS[id].emoji,
      pitch: PLANS[id].pitch,
      highlights: PLANS[id].extras.slice(0, 4),
      monthlyLabel: money(monthly),
      yearlyLabel: money(yearly),
      yearlySavingLabel: saving > 0 ? money(saving) : null,
    };
  });

  return (
    <>
      <PageHeader
        title="Mon abonnement"
        description="Votre offre, sa date de fin, et le paiement de la période suivante."
      />

      {returned === "paid" ? (
        <Callout tone="success">
          Paiement reçu, merci ! Votre abonnement est prolongé
          {endsAt ? ` jusqu'au ${formatLongDateFr(endsAt, current.timezone)}` : ""}.
        </Callout>
      ) : returned === "failed" ? (
        <Callout tone="danger">
          Le paiement n&apos;a pas abouti et rien n&apos;a été débité. Vous pouvez réessayer
          ci-dessous.
        </Callout>
      ) : returned === "pending" ? (
        <Callout tone="info">
          Votre paiement est en cours de confirmation. Rechargez cette page dans une minute :
          votre abonnement sera prolongé dès que l&apos;opérateur aura confirmé.
        </Callout>
      ) : null}

      {current.status === "SUSPENDED" ? (
        <Callout tone="danger">
          Votre compte est suspendu : votre site et vos réservations en ligne ne sont plus
          visibles. Vos données sont intactes. Un paiement ci-dessous rétablit tout aussitôt.
        </Callout>
      ) : null}

      <Section title="Où en est votre abonnement">
        <div className="card" style={{ display: "grid", gap: ".35rem" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.05rem" }}>
            {PLANS[current.plan].emoji} Offre {planLabel(current.plan)}
            {trial ? " · essai gratuit" : ` · ${current.billingPeriod === "YEARLY" ? "à l'année" : "au mois"}`}
          </p>
          <p style={{ margin: 0, color: "var(--admin-muted)" }}>
            {endsAt
              ? daysLeft !== null && daysLeft > 0
                ? `${trial ? "Votre essai se termine" : "Votre abonnement court jusqu'au"} ${trial ? "le " : ""}${formatLongDateFr(endsAt, current.timezone)}, dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`
                : `${trial ? "Votre essai s'est terminé" : "Votre abonnement a pris fin"} le ${formatLongDateFr(endsAt, current.timezone)}.`
              : "Aucune date de fin : votre accès n'est pas limité dans le temps pour l'instant."}
          </p>
        </div>
      </Section>

      <Section
        title={trial ? "Choisir mon offre" : "Renouveler ou changer d'offre"}
        description="Un paiement ajoute la durée choisie à la fin de votre période en cours : payer en avance ne vous fait perdre aucun jour."
      >
        {!online ? (
          <Callout tone="info">
            Le paiement en ligne arrive bientôt. En attendant, pour payer votre abonnement par
            Mobile Money, écrivez-nous sur{" "}
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp au {CONTACT.phone}
            </a>
            . Nous enregistrons votre paiement dans la journée.
          </Callout>
        ) : null}
        <PlanPicker plans={plans} current={current.plan} online={online} />
      </Section>

      {payments.length > 0 ? (
        <Section title="Mes paiements">
          <div className="card table-scroll" style={{ padding: 0 }}>
            <table className="data" data-stack>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Offre</th>
                  <th scope="col">Montant</th>
                  <th scope="col">Valable jusqu&apos;au</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Date">{formatLongDateFr(payment.createdAt, current.timezone)}</td>
                    <td data-label="Offre">
                      {planLabel(payment.plan)} · {payment.billingPeriod === "YEARLY" ? "1 an" : "1 mois"}
                    </td>
                    <td data-label="Montant">{formatMoney(payment.amount, payment.currency)}</td>
                    <td data-label="Valable jusqu'au">{formatLongDateFr(payment.periodEndsAt, current.timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
    </>
  );
}
