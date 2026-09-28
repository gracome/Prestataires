"use client";

import { useState } from "react";

/**
 * Paying the deposit by card or mobile money.
 *
 * The payment page is opened by navigating to it, not in a new tab: a popup
 * blocker is common on phones, and a customer who sees nothing happen assumes
 * the button is broken. She comes back on the callback URL afterwards.
 *
 * The transfer instructions stay on the page underneath. If the gateway is
 * down, or she would rather use the number she already knows, nothing here
 * takes that away from her.
 */
export function PayOnline({
  token,
  amountLabel,
}: {
  token: string;
  amountLabel: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservation/${token}/pay`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        paymentUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.paymentUrl) {
        setError(payload.error ?? "Le paiement en ligne n'a pas pu démarrer.");
        setPending(false);
        return;
      }

      window.location.href = payload.paymentUrl;
    } catch {
      setError("Connexion interrompue. Réessayez dans un instant.");
      setPending(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: ".5rem" }}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={pay}
        disabled={pending}
      >
        {pending ? "Ouverture du paiement…" : `Payer ${amountLabel} en ligne`}
      </button>

      <p style={{ margin: 0, fontSize: ".82rem", color: "var(--brand-muted)" }}>
        Carte bancaire ou mobile money, par FedaPay. Votre créneau est confirmé
        dès le paiement reçu.
      </p>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: ".84rem", color: "#8f241c" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
