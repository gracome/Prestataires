"use client";

import { Carousel } from "@/components/ui/Carousel";

/**
 * The five universes a provider can give her own site.
 *
 * Each preview is drawn with the template's own palette rather than the
 * platform's, which is the whole argument of the section: the product does not
 * impose its rose on anybody. Showing five rose variations would say the
 * opposite of what the words say.
 */

type Template = {
  key: string;
  name: string;
  mood: string;
  emoji: string;
  /** background, surface, accent, text — the template's own palette. */
  palette: [string, string, string, string];
  headline: string;
};

const TEMPLATES: Template[] = [
  {
    key: "blush",
    name: "Blush",
    mood: "Nail tech · beauté douce",
    emoji: "🌸",
    palette: ["#fff5f7", "#ffffff", "#f27a9a", "#3b2927"],
    headline: "Des ongles qui racontent votre style.",
  },
  {
    key: "editorial",
    name: "Editorial",
    mood: "Luxe · minimal",
    emoji: "🖤",
    palette: ["#f7f5f2", "#ffffff", "#1c1a19", "#1c1a19"],
    headline: "L'élégance, dans le détail.",
  },
  {
    key: "candy",
    name: "Candy",
    mood: "Girly · fun",
    emoji: "🎀",
    palette: ["#fdf2fb", "#ffffff", "#b96ad9", "#3a2140"],
    headline: "Osez la couleur.",
  },
  {
    key: "nude",
    name: "Nude",
    mood: "Premium · naturel",
    emoji: "🤎",
    palette: ["#faf5f0", "#ffffff", "#8a6244", "#3b2927"],
    headline: "Le soin, simplement.",
  },
  {
    key: "bold",
    name: "Bold",
    mood: "Audacieux",
    emoji: "❤️",
    palette: ["#fff7f4", "#ffffff", "#c8322f", "#2a1513"],
    headline: "Faites-vous remarquer.",
  },
];

export function TemplateGallery() {
  return (
    <Carousel
      ariaLabel="Modèles de site"
      autoplay={false}
      showCounter
      slides={TEMPLATES.map((template) => ({
        key: template.key,
        label: template.name,
        content: <Preview template={template} />,
      }))}
    />
  );
}

function Preview({ template }: { template: Template }) {
  const [background, surface, accent, text] = template.palette;

  return (
    <div
      style={{
        display: "grid",
        gap: "1.25rem",
        gridTemplateColumns: "minmax(0, 1fr)",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background,
          color: text,
          border: "1px solid var(--brand-border)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 24px 60px -34px rgb(59 41 39 / 30%)",
        }}
      >
        <div
          style={{
            height: 150,
            background: `linear-gradient(135deg, ${accent}26, ${accent}66)`,
            display: "grid",
            placeItems: "center",
            fontSize: "2.4rem",
          }}
          aria-hidden="true"
        >
          {template.emoji}
        </div>

        <div style={{ padding: "1.3rem 1.4rem", display: "grid", gap: ".6rem" }}>
          <span
            style={{
              fontSize: ".7rem",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              opacity: 0.66,
            }}
          >
            {template.name}
          </span>

          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
              lineHeight: 1.22,
            }}
          >
            {template.headline}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginTop: ".3rem" }}>
            <span
              style={{
                padding: ".5rem 1rem",
                borderRadius: 999,
                background: accent,
                color: surface,
                fontSize: ".84rem",
                fontWeight: 600,
              }}
            >
              Réserver →
            </span>
            <span style={{ fontSize: ".84rem", opacity: 0.7 }}>{template.mood}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
