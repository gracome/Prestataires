"use client";

import { useCallback, useEffect, useState } from "react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/dashboard/actions/push";
import { urlBase64ToUint8Array } from "@/lib/notifications/vapid";

/**
 * Turning notifications on for this device.
 *
 * Per device, not per account: a provider says yes on her phone and that is
 * where the alerts go. The browser only grants permission in response to a
 * click, so nothing is ever asked on page load — being prompted by a page you
 * did not act on is how people learn to refuse.
 */

type State =
  | { kind: "loading" }
  | { kind: "unsupported" }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string };

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !vapidPublicKey
    ) {
      setState({ kind: "unsupported" });
      return;
    }

    if (Notification.permission === "denied") {
      setState({ kind: "denied" });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setState(
        existing ? { kind: "on", endpoint: existing.endpoint } : { kind: "off" },
      );
    } catch {
      setState({ kind: "unsupported" });
    }
  }, [vapidPublicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? { kind: "denied" } : { kind: "off" });
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      // A worker registered a moment ago is not yet the one that can subscribe.
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        // Required by every browser: a push that shows nothing is not allowed.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const result = await savePushSubscriptionAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        userAgent: navigator.userAgent.slice(0, 400),
      });

      setMessage(result.status === "idle" ? null : result.message);
      setState({ kind: "on", endpoint: subscription.endpoint });
    } catch {
      setMessage("Ce navigateur a refusé d'activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setState({ kind: "off" });
      setMessage("Notifications désactivées sur cet appareil.");
    } catch {
      setMessage("La désactivation n'a pas abouti.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    const result = await sendTestPushAction();
    setMessage(result.status === "idle" ? null : result.message);
    setBusy(false);
  }

  if (state.kind === "loading") {
    return <p style={muted}>Vérification de cet appareil…</p>;
  }

  if (state.kind === "unsupported") {
    return (
      <p style={muted}>
        Ce navigateur ne gère pas les notifications, ou elles ne sont pas
        configurées sur la plateforme. Sur iPhone, ajoutez d&apos;abord le site
        à votre écran d&apos;accueil.
      </p>
    );
  }

  if (state.kind === "denied") {
    return (
      <p style={muted}>
        Les notifications sont bloquées pour ce site. Réautorisez-les dans les
        réglages de votre navigateur, puis rechargez cette page.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: ".7rem" }}>
      <p style={muted}>
        {state.kind === "on"
          ? "Cet appareil reçoit les nouvelles réservations et les preuves de paiement à vérifier."
          : "Recevez une alerte sur cet appareil dès qu'une cliente réserve ou envoie un reçu."}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
        {state.kind === "on" ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={test}
              disabled={busy}
            >
              Envoyer un test
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={disable}
              disabled={busy}
            >
              Désactiver sur cet appareil
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={enable}
            disabled={busy}
          >
            {busy ? "Activation…" : "Activer sur cet appareil"}
          </button>
        )}
      </div>

      {message ? (
        <p role="status" style={{ ...muted, margin: 0 }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The VAPID key travels as base64url; the subscription API wants raw bytes.
 */

const muted = {
  margin: 0,
  fontSize: ".85rem",
  lineHeight: 1.65,
  color: "var(--admin-muted)",
} as const;
