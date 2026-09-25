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
import { ServiceManager, type ServiceRow } from "@/components/dashboard/ServiceManager";
import { CategoryManager, type CategoryRow } from "@/components/dashboard/CategoryManager";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const { provider } = await requireSection("services");

  return (
    <>
      <PageHeader
        title="Prestations et tarifs"
        description="La durée décide des créneaux proposés. La fiche de chaque prestation décide de ce que vos clientes comprennent avant de réserver."
      />

      <Suspense
        fallback={
          <>
            <Section title="Vos prestations">
              <SkeletonList count={4} label="Chargement de vos prestations…" />
            </Section>
            <Section title="Catégories">
              <SkeletonList count={2} label="Chargement des catégories…" />
            </Section>
          </>
        }
      >
        <ServicesContent providerId={provider.id} />
      </Suspense>
    </>
  );
}

async function ServicesContent({ providerId }: { providerId: string }) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      where: { providerId: provider.id },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        category: true,
        _count: { select: { steps: true, galleryImages: true } },
      },
    }),
    prisma.category.findMany({
      where: { providerId: provider.id },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
  ]);

  const rows: ServiceRow[] = services.map((service) => {
    const deposit = computeDeposit(service.price, {
      depositRequired: service.depositRequired,
      depositType: service.depositType,
      depositValue: service.depositValue,
    });

    return {
      id: service.id,
      name: service.name,
      category: service.category?.name ?? null,
      active: service.active,
      popular: service.popular,
      imageUrl: service.imageUrl,
      stepCount: service._count.steps,
      photoCount: service._count.galleryImages,
      durationLabel: formatDurationFr(service.durationMinutes),
      priceLabel:
        service.priceType === "QUOTE_ONLY"
          ? "Sur devis"
          : `${service.priceType === "STARTING_FROM" ? "dès " : ""}${formatMoney(service.price, provider.currency, provider.locale)}`,
      depositLabel:
        deposit > 0 ? formatMoney(deposit, provider.currency, provider.locale) : null,
      // A prestation with no photo and no steps reads as a bare price line on
      // the public site, which is exactly what the showcase is meant to fix.
      incomplete:
        service.active && (!service.imageUrl || service._count.steps === 0),
    };
  });

  const incompleteCount = rows.filter((row) => row.incomplete).length;

  const categoryRows: CategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    active: category.active,
    services: services
      .filter((service) => service.categoryId === category.id)
      .map((service) => ({ id: service.id, name: service.name, active: service.active })),
  }));

  const ungrouped = services
    .filter((service) => service.categoryId === null)
    .map((service) => ({ id: service.id, name: service.name, active: service.active }));

  return (
    <>
      {incompleteCount > 0 ? (
        <Callout tone="warning">
          {incompleteCount} prestation{incompleteCount > 1 ? "s" : ""} sans photo ou
          sans déroulé. Une cliente qui ne connaît pas le nom exact ne saura pas
          ce qu&apos;elle réserve.
        </Callout>
      ) : null}

      <Section title="Vos prestations">
        <ServiceManager
          services={rows}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          currencyLabel={provider.currency === "XOF" ? "FCFA" : provider.currency}
        />
      </Section>

      <Section
        title="Catégories"
        description="Elles regroupent vos prestations sur le site public. L'ordre défini ici est celui des titres sur la page Prestations."
      >
        <CategoryManager categories={categoryRows} ungrouped={ungrouped} />
      </Section>
    </>
  );
}
