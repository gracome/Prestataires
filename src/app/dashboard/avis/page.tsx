import Link from "next/link";
import { requireSection } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatLongDateFr } from "@/lib/time";
import { summarizeReviews } from "@/lib/reviews";
import { EmptyState, PageHeader, Section, StatCard } from "@/components/dashboard/ui";
import { ReviewVisibility } from "@/components/dashboard/ReviewVisibility";

export const dynamic = "force-dynamic";

/**
 * Her customers' reviews. Each one arrived through a booking's private link
 * after the appointment, so she can trace it back; she can hide one from the
 * site, never rewrite it.
 */
export default async function ReviewsPage() {
  const { provider } = await requireSection("reviews");

  const reviews = await prisma.review.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
    include: { service: { select: { name: true } } },
    take: 300,
  });

  const shown = reviews.filter((review) => !review.hidden);
  const { average } = summarizeReviews(shown);

  return (
    <>
      <PageHeader
        title="Avis clientes"
        description="Après chaque rendez-vous, votre cliente reçoit un e-mail pour noter la prestation. Ses avis s'affichent sur votre site dès qu'elle les publie."
      />

      {reviews.length === 0 ? (
        <EmptyState
          title="Aucun avis pour le moment"
          description="La demande d'avis part automatiquement deux heures après la fin de chaque rendez-vous terminé."
        />
      ) : (
        <>
          <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "2rem" }}>
            <StatCard label="Note moyenne" value={shown.length ? `${average.toLocaleString("fr-FR")} / 5` : "–"} />
            <StatCard label="Avis affichés" value={String(shown.length)} />
            <StatCard label="Avis masqués" value={String(reviews.length - shown.length)} />
          </div>

          <Section title="Tous les avis">
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: ".75rem" }}>
              {reviews.map((review) => (
                <li key={review.id} className="card" style={{ opacity: review.hidden ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>
                        <span style={{ color: "var(--admin-accent)", letterSpacing: ".05em" }}>
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>{" "}
                        {review.customerName}
                      </p>
                      <p style={{ margin: ".2rem 0 0", color: "var(--admin-muted)", fontSize: ".85rem" }}>
                        {review.service?.name ?? "Prestation retirée"} · {formatLongDateFr(review.createdAt, provider.timezone)} ·{" "}
                        <Link href={`/dashboard/reservations/${review.appointmentId}`}>voir le rendez-vous</Link>
                        {review.hidden ? " · masqué du site" : null}
                      </p>
                    </div>
                    <ReviewVisibility reviewId={review.id} hidden={review.hidden} />
                  </div>
                  <p style={{ margin: ".75rem 0 0", lineHeight: 1.6, whiteSpace: "pre-line" }}>{review.comment}</p>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </>
  );
}
