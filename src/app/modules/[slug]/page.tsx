import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PlanFeature } from "@prisma/client";
import {
  FEATURES,
  PLANS,
  PLAN_ORDER,
  expandRequirements,
  requirementLabels,
  sellableFeatures,
  yearlyPrice,
} from "@/lib/plans/catalogue";

/**
 * One page per module.
 *
 * A price list can say what a module is called and what it costs; it cannot
 * say what changes once it is switched on. That is the question a provider
 * actually has, and it is answered here in two columns — what changes for her,
 * and what changes for her client, which is often the half that sells it.
 */

export const dynamic = "force-static";

function bySlug(slug: string): PlanFeature | null {
  return (
    (Object.keys(FEATURES) as PlanFeature[]).find(
      (key) => FEATURES[key].slug === slug,
    ) ?? null
  );
}

export function generateStaticParams() {
  return sellableFeatures().map((feature) => ({ slug: FEATURES[feature].slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = bySlug(slug);
  if (!feature) return { title: "Module introuvable" };

  return {
    title: `${FEATURES[feature].label} — Prestataires`,
    description: FEATURES[feature].intro,
  };
}

/** What one module costs on its own, everything it depends on included. */
function fullPrice(feature: PlanFeature): number {
  return expandRequirements([feature]).reduce(
    (total, part) => total + FEATURES[part].monthly,
    0,
  );
}

function fcfa(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/[  \s]/g, " ");
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = bySlug(slug);
  if (!feature || !FEATURES[feature].sellable) notFound();

  const definition = FEATURES[feature];
  const monthly = fullPrice(feature);
  const needs = requirementLabels(feature);

  // The cheapest package that already includes it: often the better buy, and
  // saying so is more useful than letting someone assemble it the dear way.
  const includedIn = PLAN_ORDER.find((plan) =>
    PLANS[plan].grants.includes(feature),
  );

  const others = sellableFeatures().filter((key) => key !== feature);

  return (
    <div className="mk">
      <header className="mk-topbar">
        <div className="container">
          <Link href="/prestataire" className="mk-back">
            ← Prestataire
          </Link>
          <Link href="/prestataire#tarifs" className="mk-topbar-cta">
            Voir les tarifs
          </Link>
        </div>
      </header>

      <main>
        <section className="mk-module-head">
          <div className="container">
            <p className="mk-eyebrow">Module</p>
            <h1 className="mk-module-title">{definition.label}</h1>
            <p className="mk-module-intro">{definition.intro}</p>

            <div className="mk-price-row">
              <span className="mk-price">
                {fcfa(monthly)} F<small> / mois</small>
              </span>
              <span className="mk-price-year">
                ou {fcfa(yearlyPrice(monthly))} F par an — 2 mois offerts
              </span>
            </div>

            {needs.length > 0 ? (
              <p className="mk-note">
                Ce module s&apos;appuie sur {needs.join(" et ")}. Le prix affiché
                les comprend.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mk-section">
          <div className="container">
            <div className="mk-two">
              <article>
                <h2>Ce que ça change pour vous</h2>
                <ul className="mk-list">
                  {definition.forProvider.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>

              {definition.forClient.length > 0 ? (
                <article>
                  <h2>Ce que ça change pour vos clientes</h2>
                  <ul className="mk-list">
                    {definition.forClient.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>

            {definition.needs && definition.needs.length > 0 ? (
              <div className="mk-callout">
                <h3>Ce qu&apos;il vous faut</h3>
                <ul className="mk-list">
                  {definition.needs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {includedIn ? (
              <div className="mk-callout mk-callout-accent">
                <h3>Déjà compris dans la formule {PLANS[includedIn].name}</h3>
                <p>
                  À {fcfa(PLANS[includedIn].monthly)} F par mois, cette formule
                  inclut ce module et tout ce qui l&apos;accompagne. C&apos;est
                  souvent le meilleur calcul.
                </p>
                <Link href="/prestataire#tarifs" className="mk-btn">
                  Comparer les formules →
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mk-section mk-section-quiet">
          <div className="container">
            <h2 className="mk-other-title">Les autres modules</h2>
            <ul className="mk-other">
              {others.map((key) => (
                <li key={key}>
                  <Link href={`/modules/${FEATURES[key].slug}`}>
                    <span className="mk-other-name">{FEATURES[key].label}</span>
                    <span className="mk-other-price">
                      {fcfa(fullPrice(key))} F/mois
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
