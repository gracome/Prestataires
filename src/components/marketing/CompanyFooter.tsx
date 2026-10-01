import Link from "next/link";
import { COMPANY, OFFERS } from "@/lib/marketing/company";

/**
 * One foot for every page of the company site.
 *
 * It closes on the company, not on the product a visitor happens to be
 * reading: whichever page she landed on, the last thing she sees should say
 * who built it and how to reach them.
 *
 * The earlier version put the name alone against three link columns pinned to
 * the right edge, which left a third of the page empty between them. The
 * columns now share one grid with the brand, so the row fills the width on its
 * own — and the invitation above it gives the footer something to say rather
 * than only something to list.
 */
export function CompanyFooter({ note }: { note?: string }) {
  const tel = `tel:${COMPANY.phone.replace(/\s/g, "")}`;

  return (
    <footer className="mk-foot">
      <div className="container">
        <div className="mk-foot-call">
          <div>
            <h2>Un projet en tête ?</h2>
            <p>
              Dites-nous ce que vous cherchez à faire. On vous répond comment on
              s&apos;y prendrait, et ce que ça demande.
            </p>
          </div>
          <a href={COMPANY.whatsapp} className="mk-btn">
            Nous écrire sur WhatsApp →
          </a>
        </div>

        <div className="mk-foot-grid">
          <div className="mk-foot-brand">
            <p className="mk-foot-name">{COMPANY.name}</p>
            <p className="mk-foot-lead">{COMPANY.tagline}</p>
            <p className="mk-foot-where">
              {COMPANY.city}, {COMPANY.country}
              <br />
              <a href={tel}>{COMPANY.phone}</a>
            </p>
          </div>

          <section>
            <h2>Ce que nous faisons</h2>
            <ul>
              {OFFERS.map((offer) => (
                <li key={offer.slug}>
                  <Link href={offer.href}>{offer.name}</Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Entreprise</h2>
            <ul>
              <li>
                <Link href="/#nous">Qui sommes-nous</Link>
              </li>
              <li>
                <Link href="/#services">Nos offres</Link>
              </li>
              <li>
                <Link href="/login">Espace client</Link>
              </li>
            </ul>
          </section>

          <section>
            <h2>Nous joindre</h2>
            <ul>
              <li>
                <a href={COMPANY.whatsapp} target="_blank" rel="noreferrer noopener">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={tel}>{COMPANY.phone}</a>
              </li>
              <li>
                <Link href="/demo">Voir une démonstration</Link>
              </li>
            </ul>
          </section>
        </div>

        <div className="mk-foot-bottom">
          <span>
            © {new Date().getFullYear()} {COMPANY.name} — {COMPANY.city},{" "}
            {COMPANY.country}
          </span>
          {note ? <span>{note}</span> : null}
        </div>
      </div>
    </footer>
  );
}
