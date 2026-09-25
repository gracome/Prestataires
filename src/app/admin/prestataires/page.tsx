import { Suspense } from "react";
import Link from "next/link";
import { requirePlatformAdminPage } from "@/lib/auth/guard";
import { listProviders, type ProviderRow } from "@/lib/platform/overview";
import {
  EmptyState,
  PageHeader,
  SkeletonBar,
  statGrid,
} from "@/components/dashboard/ui";
import { Panel, StatusTag, formatDay, formatMoment } from "@/components/admin/ui";

/**
 * Every provider account.
 *
 * One card per account with the figures that say whether it is alive, and a
 * filter on the status because "who is still in draft" and "who did I
 * suspend" are the two questions actually asked of this screen.
 */

export const dynamic = "force-dynamic";

type Query = { q?: string; statut?: string };

const FILTERS = [
  { value: "", label: "Toutes" },
  { value: "ACTIVE", label: "En ligne" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "SUSPENDED", label: "Suspendues" },
];

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requirePlatformAdminPage();
  const query = await searchParams;
  const active = FILTERS.some((f) => f.value === query.statut) ? query.statut ?? "" : "";

  return (
    <>
      <PageHeader
        title="Prestataires"
        description="Chaque carte est une activité. Ouvrir une fiche donne ses réglages et ses compteurs, jamais son fichier clientes."
        action={
          <Link href="/admin/prestataires/nouveau" className="btn btn-primary">
            Créer une activité
          </Link>
        }
      />

      <div className="pf-filters">
        <nav aria-label="Statut">
          {FILTERS.map((filter) => {
            const params = new URLSearchParams();
            if (query.q) params.set("q", query.q);
            if (filter.value) params.set("statut", filter.value);
            const search = params.toString();

            return (
              <Link
                key={filter.value || "all"}
                href={`/admin/prestataires${search ? `?${search}` : ""}`}
                className="pf-chip"
                data-selected={active === filter.value ? "true" : undefined}
                aria-current={active === filter.value ? "page" : undefined}
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>

        <form method="get">
          {active ? <input type="hidden" name="statut" value={active} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Nom, responsable, ville…"
            aria-label="Rechercher une activité"
            className="input"
          />
          <button type="submit" className="btn btn-secondary">
            Chercher
          </button>
        </form>
      </div>

      <Suspense key={`${query.q ?? ""}|${active}`} fallback={<ListSkeleton />}>
        <ProviderList search={query.q} status={active} />
      </Suspense>

      <style>{`
        .pf-filters {
          display: flex;
          gap: .75rem;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .pf-filters nav { display: flex; gap: .35rem; flex-wrap: wrap; }
        .pf-filters form {
          display: flex;
          gap: .5rem;
          margin-left: auto;
          flex: 1 1 260px;
          max-width: 420px;
        }
        .pf-filters .input { min-height: 40px; }
        .pf-chip {
          display: inline-flex;
          align-items: center;
          padding: .38rem .8rem;
          border-radius: 999px;
          border: 1px solid var(--admin-border);
          background: var(--admin-surface);
          color: var(--admin-text);
          font-size: .82rem;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }
        .pf-chip:hover { background: var(--admin-subtle); }
        .pf-chip[data-selected="true"] {
          background: var(--admin-accent);
          border-color: var(--admin-accent);
          color: var(--admin-accent-fg);
        }
      `}</style>
    </>
  );
}

async function ProviderList({
  search,
  status,
}: {
  search?: string;
  status?: string;
}) {
  const all = await listProviders(search);
  const providers = status ? all.filter((row) => row.status === status) : all;

  if (providers.length === 0) {
    return (
      <EmptyState
        title={
          search || status ? "Aucune activité ne correspond" : "Aucune activité"
        }
        description={
          search || status
            ? "Essayez un autre mot, ou retirez le filtre."
            : "Créez la première activité pour démarrer."
        }
      />
    );
  }

  const busiest = Math.max(1, ...providers.map((row) => row.appointments));

  return (
    <>
      <p style={{ margin: "0 0 .75rem", fontSize: ".82rem", color: "var(--admin-muted)" }}>
        {providers.length} activité{providers.length > 1 ? "s" : ""}
        {status ? ` · ${FILTERS.find((f) => f.value === status)?.label.toLowerCase()}` : ""}
      </p>

      <div style={{ display: "grid", gap: ".75rem" }}>
        {providers.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} busiest={busiest} />
        ))}
      </div>
    </>
  );
}

function ProviderCard({
  provider,
  busiest,
}: {
  provider: ProviderRow;
  busiest: number;
}) {
  return (
    <Panel
      title={provider.businessName}
      action={
        <span style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <StatusTag status={provider.status} />
          <Link href={`/admin/prestataires/${provider.id}`} style={{ fontSize: ".82rem" }}>
            Ouvrir
          </Link>
        </span>
      }
    >
      <p style={{ margin: "-.4rem 0 .85rem", fontSize: ".84rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
        {provider.ownerName} · {provider.email}
        {provider.city ? ` · ${provider.city}` : ""}
        <br />
        <a href={`/${provider.slug}`} target="_blank" rel="noopener noreferrer">
          /{provider.slug}
        </a>{" "}
        · créée le {formatDay(provider.createdAt)} · dernière connexion{" "}
        {formatMoment(provider.lastLoginAt)}
      </p>

      <div style={statGrid}>
        <Figure label="Prestations" value={String(provider.activeServices)} />
        <Figure label="Rendez-vous" value={String(provider.appointments)} />
        <Figure label="Honorés" value={String(provider.honoured)} />
        <Figure
          label="Dernière réservation"
          value={provider.lastBookingAt ? formatDay(provider.lastBookingAt) : "aucune"}
        />
      </div>

      <div
        aria-hidden="true"
        title={`${provider.appointments} rendez-vous`}
        style={{
          marginTop: ".9rem",
          height: 5,
          borderRadius: 999,
          background: "var(--admin-subtle)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${Math.round((provider.appointments / busiest) * 100)}%`,
            background: "var(--admin-accent)",
          }}
        />
      </div>
    </Panel>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: ".7rem",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          fontWeight: 700,
          color: "var(--admin-muted)",
        }}
      >
        {label}
      </p>
      <p style={{ margin: ".2rem 0 0", fontWeight: 700, fontSize: "1.05rem" }}>
        {value}
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div style={{ display: "grid", gap: ".75rem" }}>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="card">
          <SkeletonBar width="32%" height={14} />
          <div style={{ marginTop: ".7rem" }}>
            <SkeletonBar width="65%" height={10} />
          </div>
          <div style={{ marginTop: ".9rem" }}>
            <SkeletonBar width="100%" height={54} />
          </div>
        </div>
      ))}
    </div>
  );
}
