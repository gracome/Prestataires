import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.15rem",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <p className="eyebrow">Erreur 404</p>
        <h1 className="font-display" style={{ fontSize: "1.8rem", margin: ".4rem 0 .75rem" }}>
          Page introuvable
        </h1>
        <p style={{ color: "var(--brand-muted)", lineHeight: 1.7, margin: "0 0 1.75rem" }}>
          Cette page n&apos;existe pas ou n&apos;est plus disponible. Si vous
          suiviez un lien de réservation, demandez à la prestataire de vous le
          renvoyer.
        </p>
        <Link href="/" className="btn btn-primary">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
