import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { PageHeader, Section } from "@/components/dashboard/ui";
import { ServiceEditor } from "@/components/dashboard/ServiceEditor";

export const dynamic = "force-dynamic";

export default async function ServiceEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { provider } = await requireSection("services");

  const service = await prisma.service.findFirst({
    // Scoped by provider, so another tenant's id simply does not resolve.
    where: { id, providerId: provider.id },
    include: {
      steps: { orderBy: { position: "asc" } },
      galleryImages: {
        where: { active: true },
        orderBy: [{ featured: "desc" }, { position: "asc" }],
      },
    },
  });

  if (!service) notFound();

  const categories = await prisma.category.findMany({
    where: { providerId: provider.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const publicUrl = appUrl(`/${provider.slug}/prestations/${service.slug}`);

  return (
    <>
      <Link
        href="/dashboard/services"
        style={{ fontSize: ".88rem", display: "inline-block", marginBottom: "1rem" }}
      >
        ← Toutes les prestations
      </Link>

      <PageHeader
        title={service.name}
        description="Tout ce qui apparaît sur la fiche publique de cette prestation."
        action={
          service.active ? (
            <a
              href={`/${provider.slug}/prestations/${service.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: ".5rem 1rem", minHeight: 38, fontSize: ".85rem" }}
            >
              Voir la fiche publique
            </a>
          ) : null
        }
      />

      <ServiceEditor
        categories={categories}
        currencyLabel={provider.currency === "XOF" ? "FCFA" : provider.currency}
        steps={service.steps.map((step) => ({
          id: step.id,
          title: step.title,
          description: step.description,
          durationMinutes: step.durationMinutes,
          imageUrl: step.imageUrl,
        }))}
        service={{
          id: service.id,
          name: service.name,
          slug: service.slug,
          description: service.description ?? "",
          shortDescription: service.shortDescription ?? "",
          categoryId: service.categoryId ?? "",
          imageUrl: service.imageUrl ?? "",
          price: service.price,
          priceType: service.priceType,
          durationMinutes: service.durationMinutes,
          bufferAfterMinutes: service.bufferAfterMinutes,
          depositRequired: service.depositRequired,
          depositType: service.depositType,
          depositValue: service.depositValue,
          active: service.active,
          popular: service.popular,
          idealFor: service.idealFor ?? "",
          included: service.included ?? "",
          preparation: service.preparation ?? "",
          aftercare: service.aftercare ?? "",
        }}
      />

      <Section
        title="Photos rattachées"
        description="Les réalisations que vous rattachez à cette prestation depuis la galerie apparaissent sur sa fiche."
      >
        {service.galleryImages.length === 0 ? (
          <p style={{ color: "var(--admin-muted)", fontSize: ".9rem" }}>
            Aucune photo rattachée.{" "}
            <Link href="/dashboard/galerie">Ajouter des photos à la galerie</Link>, puis
            choisissez cette prestation au moment de l&apos;envoi.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: ".6rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            }}
          >
            {service.galleryImages.map((image) => (
              <li key={image.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.caption ?? ""}
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid var(--admin-border)",
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Adresse publique">
        <div className="card">
          <p style={{ margin: "0 0 .6rem", fontSize: ".88rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
            Partagez ce lien directement, par exemple en story ou en réponse à une
            question sur WhatsApp.
          </p>
          <code
            style={{
              display: "block",
              fontSize: ".8rem",
              wordBreak: "break-all",
              background: "var(--admin-subtle)",
              padding: ".6rem .7rem",
              borderRadius: 8,
            }}
          >
            {publicUrl}
          </code>
        </div>
      </Section>
    </>
  );
}
