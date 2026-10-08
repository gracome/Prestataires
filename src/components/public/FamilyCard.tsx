import Link from "next/link";

/**
 * One trade on the catalogue's first page: its photograph, its name, how many
 * prestations it holds and where its prices start. Built on the photo card so
 * it reads as the provider's work, but it leads to a list, not to one
 * prestation.
 */
export function FamilyCard({
  href,
  name,
  description,
  imageUrl,
  count,
  fromLabel,
}: {
  href: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  count: number;
  fromLabel: string | null;
}) {
  return (
    <article className="photo-card family-card">
      <Link href={href} className="photo-card-link">
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imageUrl} alt="" loading="lazy" className="photo-card-img" />
        ) : (
          <span aria-hidden="true" className="photo-card-fallback" />
        )}

        <span className="photo-card-scrim" aria-hidden="true" />

        <span className="family-card-body">
          <span className="photo-card-meta">
            {count} prestation{count > 1 ? "s" : ""}
            {fromLabel ? ` · dès ${fromLabel}` : null}
          </span>
          <span className="family-card-title">{name}</span>
          {description ? <span className="photo-card-desc">{description}</span> : null}
          <span className="family-card-cta">
            Voir les prestations <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </article>
  );
}
