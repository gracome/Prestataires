import { stopImpersonationAction } from "@/app/admin/actions";

/**
 * The band shown while a platform administrator is inside a provider's
 * account.
 *
 * It is loud on purpose. An administrator who forgets whose screen they are on
 * will eventually answer a customer, cancel an appointment or change a price
 * in someone else's business. It is also the visible half of the promise made
 * to the provider: support access is never quiet.
 */
export function ImpersonationBanner({
  adminName,
  businessName,
}: {
  adminName: string;
  businessName: string;
}) {
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: ".75rem",
        flexWrap: "wrap",
        padding: ".6rem 1rem",
        background: "#7f1d1d",
        color: "#fff5f5",
        fontSize: ".85rem",
        lineHeight: 1.5,
        position: "sticky",
        top: 0,
        zIndex: 60,
      }}
    >
      <strong style={{ fontWeight: 700 }}>Session de support</strong>
      <span style={{ minWidth: 0 }}>
        Vous êtes {adminName}, connecté dans le compte de {businessName}. Tout
        ce que vous faites ici est enregistré sous son nom et visible par elle.
      </span>

      <form action={stopImpersonationAction} style={{ marginLeft: "auto" }}>
        <button
          type="submit"
          style={{
            padding: ".35rem .8rem",
            borderRadius: 8,
            border: "1px solid rgb(255 255 255 / 45%)",
            background: "transparent",
            color: "inherit",
            fontFamily: "inherit",
            fontSize: ".82rem",
            fontWeight: 700,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          Quitter la session
        </button>
      </form>
    </div>
  );
}
