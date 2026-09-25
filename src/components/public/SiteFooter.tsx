import Link from "next/link";
import type { PublicSite } from "@/lib/providers/public-site";
import { telLink, whatsappLink } from "@/lib/providers/public-site";

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

  return (
    <footer
      style={{
        borderTop: "1px solid var(--brand-border)",
        paddingBlock: "2.5rem 2rem",
        marginTop: "1rem",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gap: "1.75rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          <div>
            <p className="font-display" style={{ fontSize: "1.1rem", margin: "0 0 .4rem" }}>
              {site.businessName}
            </p>
            {site.tagline ? (
              <p style={{ margin: 0, color: "var(--brand-muted)", fontSize: ".9rem", lineHeight: 1.6 }}>
                {site.tagline}
              </p>
            ) : null}
          </div>

          <div>
            <p style={footerHeading}>Contact</p>
            <ul style={footerList}>
              {tel ? (
                <li>
                  <a href={tel} style={footerLink}>
                    {site.phone}
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" style={footerLink}>
                    WhatsApp
                  </a>
                </li>
              ) : null}
              <li>
                <a href={`mailto:${site.email}`} style={footerLink}>
                  {site.email}
                </a>
              </li>
            </ul>
          </div>

          {site.addressLine || site.city ? (
            <div>
              <p style={footerHeading}>Adresse</p>
              <p style={{ ...footerText, whiteSpace: "pre-line" }}>
                {[site.addressLine, site.city, site.country].filter(Boolean).join("\n")}
              </p>
              {site.mapsUrl ? (
                <a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" style={footerLink}>
                  Voir sur la carte
                </a>
              ) : null}
            </div>
          ) : null}

          {site.socialLinks.length > 0 ? (
            <div>
              <p style={footerHeading}>Réseaux</p>
              <ul style={footerList}>
                {site.socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={footerLink}
                    >
                      {SOCIAL_LABELS[link.platform.toLowerCase()] ?? link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--brand-border)",
            display: "flex",
            flexWrap: "wrap",
            gap: ".75rem",
            justifyContent: "space-between",
            fontSize: ".82rem",
            color: "var(--brand-muted)",
          }}
        >
          <span>
            © {year} {site.businessName}
          </span>
          <Link href={`/${site.slug}/reservation`} style={footerLink}>
            Prendre rendez-vous
          </Link>
        </div>
      </div>
    </footer>
  );
}

const footerHeading: React.CSSProperties = {
  fontSize: ".75rem",
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--brand-muted)",
  margin: "0 0 .6rem",
  fontWeight: 600,
};

const footerList: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: ".4rem",
};

const footerLink: React.CSSProperties = {
  color: "var(--brand-text)",
  textDecoration: "none",
  fontSize: ".9rem",
};

const footerText: React.CSSProperties = {
  margin: "0 0 .5rem",
  color: "var(--brand-muted)",
  fontSize: ".9rem",
  lineHeight: 1.6,
};
