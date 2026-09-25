import Link from "next/link";
import { Suspense } from "react";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { PageHeader, SkeletonForm, SkeletonGrid } from "@/components/dashboard/ui";
import { GalleryManager, type GalleryRow } from "@/components/dashboard/GalleryManager";

export const dynamic = "force-dynamic";

export default async function GaleriePage() {
  const { provider } = await requireSection("gallery");

  return (
    <>
      <PageHeader
        title="Vitrine et réalisations"
        description="Vos photos alimentent la page Réalisations de votre site, et les fiches des prestations auxquelles vous les rattachez."
      />

      <Suspense
        fallback={
          <>
            <SkeletonForm rows={3} />
            <div style={{ height: "1.5rem" }} />
            <SkeletonGrid count={8} />
          </>
        }
      >
        <GalerieContent providerId={provider.id} />
      </Suspense>
    </>
  );
}

async function GalerieContent({ providerId }: { providerId: string }) {
  const provider = await prisma.provider.findUniqueOrThrow({
    where: { id: providerId },
  });

  const [images, services, categories, settings] = await Promise.all([
    prisma.galleryImage.findMany({
      where: { providerId: provider.id },
      orderBy: [{ featured: "desc" }, { position: "asc" }, { createdAt: "desc" }],
      include: {
        service: { select: { name: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.service.findMany({
      where: { providerId: provider.id },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { providerId: provider.id },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.siteSettings.findUnique({
      where: { providerId: provider.id },
      select: { showRealisations: true },
    }),
  ]);

  const rows: GalleryRow[] = images.map((image) => ({
    id: image.id,
    url: image.url,
    caption: image.caption,
    categoryId: image.categoryId,
    categoryName: image.category?.name ?? null,
    category: image.category?.name ?? null,
    featured: image.featured,
    serviceName: image.service?.name ?? null,
  }));



  return (
    <>
      {settings?.showRealisations === false ? (
        <p
          style={{
            margin: "0 0 1.25rem",
            padding: ".85rem 1rem",
            background: "var(--tone-warning-bg)",
            color: "var(--tone-warning-fg)",
            borderRadius: 10,
            fontSize: ".9rem",
            lineHeight: 1.6,
          }}
        >
          La page Réalisations est désactivée : vos photos n&apos;apparaissent que
          sur la page d&apos;accueil.{" "}
          <Link href="/dashboard/informations">Réactiver la page</Link>
        </p>
      ) : (
        <p style={{ margin: "0 0 1.25rem", fontSize: ".85rem", color: "var(--admin-muted)" }}>
          Adresse publique : {appUrl(`/${provider.slug}/realisations`)}
        </p>
      )}

      <GalleryManager
        images={rows}
        services={services}
        categories={categories}
      />
    </>
  );
}
