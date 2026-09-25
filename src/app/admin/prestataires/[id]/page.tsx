import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdminPage } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { listProviders, supportVisits } from "@/lib/platform/overview";
import { roleLabelFr } from "@/lib/auth/permissions";
import { PageHeader, StatCard, statGrid } from "@/components/dashboard/ui";
import { Panel, StatusTag, formatDay, formatMoment } from "@/components/admin/ui";
import { ProviderActions } from "@/components/admin/ProviderActions";
import { EditProviderForm } from "@/components/admin/EditProviderForm";

/**
 * One provider account, seen from the platform.
 *
 * Counts, sums, dates, her own settings and the accounts that can sign in. No
 * appointment, no customer, no payment proof. The button that reaches her
 * actual data is the support session, and it announces itself.
 */

export const dynamic = "force-dynamic";

export default async function ProviderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdminPage();
  const { id } = await params;

  const provider = await prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      businessName: true,
      ownerName: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      timezone: true,
      currency: true,
      locale: true,
      description: true,
      tagline: true,
      whatsappPhone: true,
      addressLine: true,
      createdAt: true,
      theme: {
        select: {
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          backgroundColor: true,
        },
      },
      _count: { select: { categories: true, galleryImages: true } },
    },
  });

  if (!provider) notFound();

  const [rows, visits, accounts] = await Promise.all([
    listProviders(provider.slug),
    supportVisits({ providerId: provider.id }, 10),
    prisma.user.findMany({
      where: { providerId: provider.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const figures = rows.find((row) => row.id === provider.id);

  return (
    <>
      <p style={{ margin: "0 0 .75rem", fontSize: ".85rem" }}>
        <Link href="/admin/prestataires">← Toutes les activités</Link>
      </p>

      <PageHeader
        title={provider.businessName}
        description={`${provider.ownerName} · créée le ${formatDay(provider.createdAt)} · ${provider.email}`}
        action={
          <span style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
            <StatusTag status={provider.status} />
            <a
              href={`/${provider.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ minHeight: 38, fontSize: ".85rem" }}
            >
              Voir le site
            </a>
          </span>
        }
      />

      <div style={{ ...statGrid, marginBottom: "1.5rem" }}>
        <StatCard
          label="Prestations"
          value={figures?.activeServices ?? 0}
          hint="actives"
        />
        <StatCard
          label="Rendez-vous"
          value={figures?.appointments ?? 0}
          hint="depuis la création"
        />
        <StatCard
          label="Rendez-vous honorés"
          value={figures?.honoured ?? 0}
          hint="terminés ou confirmés"
        />
        <StatCard label="Catégories" value={provider._count.categories} />
        <StatCard label="Photos" value={provider._count.galleryImages} />
        <StatCard
          label="Dernière réservation"
          value={figures?.lastBookingAt ? formatDay(figures.lastBookingAt) : "aucune"}
        />
      </div>

      <div className="pf-detail">
        <div className="pf-col">
          <EditProviderForm
            provider={{
              id: provider.id,
              businessName: provider.businessName,
              ownerName: provider.ownerName,
              tagline: provider.tagline,
              description: provider.description,
              phone: provider.phone,
              whatsappPhone: provider.whatsappPhone,
              addressLine: provider.addressLine,
              city: provider.city,
              country: provider.country,
              timezone: provider.timezone,
              currency: provider.currency,
              primaryColor: provider.theme?.primaryColor ?? "#B0797A",
              secondaryColor: provider.theme?.secondaryColor ?? "#2F2A2B",
              accentColor: provider.theme?.accentColor ?? "#E8C7A8",
              backgroundColor: provider.theme?.backgroundColor ?? "#FBF8F6",
            }}
          />

          <Panel title="Comptes de connexion" hint={`${accounts.length} sur 3`}>
            <ul className="pf-rows">
              {accounts.map((account) => (
                <li key={account.id}>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {account.name}{" "}
                    <span className="pill pill-neutral" style={{ fontSize: ".7rem" }}>
                      {roleLabelFr(account.role)}
                    </span>
                    {account.active ? null : (
                      <span className="pill pill-danger" style={{ fontSize: ".7rem", marginLeft: ".3rem" }}>
                        désactivé
                      </span>
                    )}
                  </p>
                  <p className="pf-meta">
                    {account.email} · dernière connexion {formatMoment(account.lastLoginAt)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="pf-col">
          <ProviderActions
            providerId={provider.id}
            businessName={provider.businessName}
            status={provider.status}
          />

          <Panel title="Visites de support">
            <p style={{ margin: "-.4rem 0 .8rem", fontSize: ".82rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
              Les mêmes lignes sont affichées à {provider.businessName} dans ses
              paramètres.
            </p>

            {visits.length === 0 ? (
              <p style={{ margin: 0, fontSize: ".86rem", color: "var(--admin-muted)" }}>
                Personne n&apos;est entré dans ce compte.
              </p>
            ) : (
              <ul className="pf-rows">
                {visits.map((visit) => (
                  <li key={visit.id}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{visit.adminName}</p>
                    <p className="pf-meta">
                      {formatMoment(visit.startedAt)} ·{" "}
                      {visit.endedAt ? "terminée" : "en cours ou expirée"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <style>{`
        .pf-detail { display: grid; gap: 1rem; }
        .pf-col { display: grid; gap: 1rem; align-content: start; min-width: 0; }
        @media (min-width: 1000px) {
          .pf-detail { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); }
        }
        .pf-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: .75rem; }
        .pf-meta {
          margin: .2rem 0 0;
          font-size: .8rem;
          color: var(--admin-muted);
          word-break: break-word;
        }
      `}</style>
    </>
  );
}
