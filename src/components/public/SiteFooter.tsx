import Link from "next/link";
import type { PublicSite } from "@/lib/providers/public-site";
import { telLink, whatsappLink } from "@/lib/providers/public-site";

/**
 * The foot of a provider's site, as a dark block that curves up over the page.
 *
 * A pale footer separated by a hairline is where a page runs out; a dark one
 * with a radius on it is where a page ends. The difference costs nothing and
 * is most of what makes a site feel finished.
 *
 * It stays chocolate rather than taking the provider's accent colour: whatever
 * palette she picks, the closing block has to hold small white text, and a
 * pale accent would not.
 */

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  x: "X",
  website: "Site web",
};

export function SiteFooter({ site }: { site: PublicSite }) {
  const whatsapp = whatsappLink(site);
  const tel = telLink(site.phone);
  const year = new Date().getFullYear();

  const address = [site.addressLine, site.city, site.country]
    .filter(Boolean)
    .join("\n");

  return (
    <footer className="site-foot">
      <div className="container">
        <div className="site-foot-top">
          <div>
            <p className="site-foot-name">{site.businessName}</p>
            {site.tagline ? <p className="site-foot-lead">{site.tagline}</p> : null}

            <Link href={`/${site.slug}/reservation`} className="btn site-foot-cta">
              Prendre rendez-vous →
            </Link>
          </div>

          <div className="site-foot-cols">
            <section>
              <h2>Contact</h2>
              <ul>
                {tel ? (
                  <li>
                    <a href={tel}>{site.phone}</a>
                  </li>
                ) : null}
                {whatsapp ? (
                  <li>
                    <a href={whatsapp}>WhatsApp</a>
                  </li>
                ) : null}
                <li>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
              </ul>
            </section>

            {address ? (
              <section>
                <h2>Adresse</h2>
                <p className="site-foot-address">{address}</p>
              </section>
            ) : null}

            {site.socialLinks.length > 0 ? (
              <section>
                <h2>Réseaux</h2>
                <ul>
                  {site.socialLinks.map((link) => (
                    <li key={link.id}>
                      <a href={link.url} target="_blank" rel="noreferrer noopener">
                        {SOCIAL_LABELS[link.platform] ?? link.platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        <div className="site-foot-bottom">
          <span>
            © {year} {site.businessName}
          </span>
          <span className="site-foot-by">
            Propulsé par <Link href="/">Prestataires</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
