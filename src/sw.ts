// This file runs in the ServiceWorker global scope, not the DOM — it needs
// the "webworker" lib, which conflicts with the rest of the app's "dom" lib
// if added to the same tsconfig. @serwist/next bundles this file separately,
// so we skip the main project's type-check for it rather than fight tsconfig.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never cache API responses. The default rule stores GET /api/* for 24h,
    // so on a shared device the next person could be shown the previous
    // user's recharges while offline. First match wins, so this goes first.
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Push notifications arrive here regardless of whether the app tab is open —
// this is what makes "Papa's recharge is due" show up even if Recharge Guard isn't open.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json() as { title: string; body: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/dashboard"));
});
