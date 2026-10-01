import Link from "next/link";
import { COMPANY, OFFERS } from "@/lib/marketing/company";

/**
 * One foot for every page of the company site.
 *
 * It closes on the company, not on the product a visitor happens to be
 * reading: whichever page she landed on, the last thing she sees should tell
 * her who built it and how to reach them.
 *
 * `note` is for a page that has something true to add in the corner — how many
 * providers are live, for instance. It stays optional because most pages do
 * not, and an empty slot is better than a filled one.
 */
export function CompanyFooter({ note }: { note?: string }) {
  return (
    <footer className="mk-foot">
      <div className="container">
        <div className="mk-foot-top">
          <div>
            <p className="mk-foot-name">{COMPANY.name}</p>
            <p className="mk-foot-lead">{COMPANY.tagline}</p>
          </div>

          <div className="mk-foot-cols">
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

            {/* This column used to belong to Prestataire alone — demo, prices,
                sign-in — which gave one of three offers a quarter of the foot
                of every page on the site. */}
            <section>
              <h2>Entreprise</h2>
              <ul>
                <li>
                  <Link href="/#nous">Qui sommes-nous</Link>
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
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                    {COMPANY.phone}
                  </a>
                </li>
              </ul>
            </section>
          </div>
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
