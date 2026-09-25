import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — espace prestataire",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <div
      className="admin"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.15rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <p className="eyebrow" style={{ color: "var(--admin-accent)" }}>
          Espace prestataire
        </p>
        <h1 style={{ fontSize: "1.6rem", margin: ".35rem 0 1.5rem", fontWeight: 700 }}>
          Connexion
        </h1>

        <div className="card">
          <LoginForm next={next} />
        </div>

        <p style={{ marginTop: "1.25rem", fontSize: ".82rem", color: "var(--admin-muted)", lineHeight: 1.6 }}>
          Vous avez oublié votre mot de passe ? Contactez l&apos;administrateur de
          la plateforme pour le réinitialiser.
        </p>
      </div>
    </div>
  );
}
