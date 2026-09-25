import Link from "next/link";
import { Suspense } from "react";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { computeDeposit, formatMoney } from "@/lib/money";
import { formatDurationFr } from "@/lib/time";
import {
  Callout,
  PageHeader,
  Section,
  SkeletonList,
} from "@/components/dashboard/ui";
import { PaymentInstructionManager } from "@/components/dashboard/PaymentInstructionManager";

export const dynamic = "force-dynamic";

export default async function PaiementPage() {
  const { provider } = await requireSection("payment");

  return (
    <>
      <PageHeader
        title="Paiement et acompte"
        description="La plateforme ne reçoit jamais l'argent : vos clientes vous paient directement, puis envoient une preuve que vous vérifiez."
      />

      <Suspense
        fallback={
          <Section title="Où vos clientes envoient l'acompte">
            <SkeletonList count={2} label="Chargement des moyens de paiement…" />
          </Section>
        }
      >
        <PaiementContent providerId={provider.id} />
      </Suspense>
    </>
  );
}

async function PaiementContent({ providerId }: { providerId: string }) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  const [instructions, depositServices, settings] = await Promise.all([
    prisma.paymentInstruction.findMany({
      where: { providerId: provider.id },
      orderBy: { position: "asc" },
    }),
    prisma.service.findMany({
      where: { providerId: provider.id, active: true, depositRequired: true },
      orderBy: { name: "asc" },
    }),
    prisma.bookingSettings.findUnique({ where: { providerId: provider.id } }),
  ]);

  const activeInstructions = instructions.filter((i) => i.active);

  return (
    <>
      {depositServices.length > 0 && activeInstructions.length === 0 ? (
        <Callout tone="danger">
          Des prestations demandent un acompte mais aucun moyen de paiement
          actif n&apos;est enregistré. Vos clientes ne sauront pas où envoyer
          l&apos;argent.
        </Callout>
      ) : null}

      <Section
        title="Où vos clientes envoient l'acompte"
        description="Ces informations s'affichent après la réservation et dans l'email envoyé à la cliente."
      >
        <PaymentInstructionManager instructions={instructions} />
      </Section>

      <Section
        title="Prestations avec acompte"
        description="L'acompte se règle prestation par prestation, depuis la page Prestations et tarifs."
        action={
          <Link href="/dashboard/services" style={{ fontSize: ".85rem" }}>
            Gérer les prestations
          </Link>
        }
      >
        {depositServices.length === 0 ? (
          <p style={{ color: "var(--admin-muted)", fontSize: ".9rem" }}>
            Aucune prestation ne demande d&apos;acompte pour le moment. Les
            réservations sont confirmées immédiatement.
          </p>
        ) : (
          <div className="card table-scroll" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Prestation</th>
                  <th scope="col">Prix</th>
                  <th scope="col">Acompte</th>
                  <th scope="col">Solde sur place</th>
                </tr>
              </thead>
              <tbody>
                {depositServices.map((service) => {
                  const deposit = computeDeposit(service.price, {
                    depositRequired: service.depositRequired,
                    depositType: service.depositType,
                    depositValue: service.depositValue,
                  });
                  return (
                    <tr key={service.id}>
                      <td>
                        {service.name}
                        <span style={{ display: "block", color: "var(--admin-muted)", fontSize: ".82rem" }}>
                          {formatDurationFr(service.durationMinutes)}
                          {service.depositType === "PERCENTAGE"
                            ? ` · ${service.depositValue} % du prix`
                            : ""}
                        </span>
                      </td>
                      <td>{formatMoney(service.price, provider.currency, provider.locale)}</td>
                      <td style={{ fontWeight: 600 }}>
                        {formatMoney(deposit, provider.currency, provider.locale)}
                      </td>
                      <td>
                        {formatMoney(service.price - deposit, provider.currency, provider.locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Délais en vigueur">
        <div className="card">
          <Row
            label="Blocage du créneau après réservation"
            value={formatDurationFr(settings?.holdDurationMinutes ?? 30)}
          />
          <Row
            label="Délai pour envoyer la preuve"
            value={formatDurationFr(settings?.proofDeadlineMinutes ?? 30)}
          />
          <Row
            label="Délai pour vérifier la preuve"
            value={formatDurationFr(settings?.verificationDeadlineMinutes ?? 120)}
          />
          <p style={{ margin: "1rem 0 0", fontSize: ".85rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
            Passé ces délais, la réservation expire automatiquement et le
            créneau redevient disponible.{" "}
            <Link href="/dashboard/parametres">Modifier les délais</Link>
          </p>
        </div>
      </Section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
      <span style={{ color: "var(--admin-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
