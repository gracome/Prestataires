/**
 * Service worker, for push notifications only.
 *
 * Deliberately does not cache anything. A booking screen showing yesterday's
 * availability would be worse than a slow one, and offline support is not what
 * this application was asked for.
 */

// Take over as soon as a new version is installed, rather than waiting for
// every tab to close. A provider who reloads should get the fixed worker.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  // A push with no body still deserves something on screen: the alternative on
  // some platforms is the browser showing its own generic notice.
  let payload = {
    title: "Nouvelle activité",
    body: "Ouvrez votre tableau de bord.",
    url: "/dashboard",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/icon-192.png",
      badge: "/badge.png",
      // Same tag replaces an earlier notice rather than stacking: a provider
      // coming back to her phone wants the current state, not a pile.
      tag: payload.tag || "prestataire",
      renotify: Boolean(payload.tag),
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Reuse a tab already on the dashboard instead of opening a third one.
        for (const client of clients) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
