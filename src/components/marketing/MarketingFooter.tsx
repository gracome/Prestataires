import Link from "next/link";
import { CONTACT, PRODUCT } from "@/lib/marketing/product";

/**
 * One foot for every page that sells the product.
 *
 * The invitation above the columns gives the footer something to say rather
 * than only something to list, and the columns share one grid with the brand
 * so the row fills the width instead of leaving a third of the page empty
 * between the name and the links.
 */
export function MarketingFooter({ note }: { note?: string }) {
  const tel = `tel:${CONTACT.phone.replace(/\s/g, "")}`;

  return (
    <footer className="mk-foot">
      <div className="container">
        <div className="mk-foot-call">
          <div>
            <h2>Une question avant de commencer ?</h2>
            <p>
              Dites-nous quel métier vous exercez et comment vous travaillez
              aujourd&apos;hui. On vous dit franchement si c&apos;est pour vous.
            </p>
          </div>
          <a href={CONTACT.whatsapp} className="mk-btn">
            Nous écrire sur WhatsApp →
          </a>
        </div>

        <div className="mk-foot-grid">
          <div className="mk-foot-brand">
            <p className="mk-foot-name">{PRODUCT.name}</p>
            <p className="mk-foot-lead">{PRODUCT.tagline}</p>
            <p className="mk-foot-where">
              {CONTACT.city}, {CONTACT.country}
              <br />
              <a href={tel}>{CONTACT.phone}</a>
            </p>
          </div>

          <section>
            <h2>Le produit</h2>
            <ul>
              <li>
                <Link href="/#tarifs">Tarifs</Link>
              </li>
              <li>
                <Link href="/#modules">Modules</Link>
              </li>
              <li>
                <Link href="/demo">Voir une démonstration</Link>
              </li>
            </ul>
          </section>

          <section>
            <h2>À propos</h2>
            <ul>
              <li>
                <Link href="/#nous">Qui sommes-nous</Link>
              </li>
              <li>
                <Link href="/#demo">Simuler mon activité</Link>
              </li>
              <li>
                <Link href="/login">Mon espace</Link>
              </li>
            </ul>
          </section>

          <section>
            <h2>Nous joindre</h2>
            <ul>
              <li>
                <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer noopener">
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={tel}>{CONTACT.phone}</a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mk-foot-bottom">
          <span>
            © {new Date().getFullYear()} {PRODUCT.name} — {CONTACT.city},{" "}
            {CONTACT.country}
          </span>
          {note ? <span>{note}</span> : null}
        </div>
      </div>
    </footer>
  );
}
