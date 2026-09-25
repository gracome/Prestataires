import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

/**
 * Landing spot for a signed-in account that has no provider attached yet.
 *
 * Provider creation is an administrator task in V1 (see scripts/create-provider.ts),
 * so this page explains the situation rather than pretending to be a wizard.
 */
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.provider) redirect("/dashboard");
  // A platform administrator has no provider on purpose. Sending them here
  // would tell them to contact an administrator, which is themselves.
  if (user.role === "PLATFORM_ADMIN") redirect("/admin");

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
      <div className="card" style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: "1.3rem", margin: "0 0 .75rem", fontWeight: 700 }}>
          Aucun espace prestataire associé
        </h1>
        <p style={{ color: "var(--admin-muted)", lineHeight: 1.7, margin: "0 0 1.5rem" }}>
          Votre compte existe, mais il n&apos;est rattaché à aucune activité.
          Contactez l&apos;administrateur de la plateforme pour qu&apos;il crée
          votre espace.
        </p>

        <form action={logout}>
          <button type="submit" className="btn btn-secondary">
            Se déconnecter
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", fontSize: ".82rem", color: "var(--admin-muted)" }}>
          <Link href="/">Retour à l&apos;accueil</Link>
        </p>
      </div>
    </div>
  );
}
