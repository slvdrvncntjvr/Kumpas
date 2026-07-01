"use client";

import { useEffect } from "react";

export function DevServiceWorkerCleanup() {
  useEffect(() => {
    const cleanup = async () => {
      let shouldReload = false;

      if ("serviceWorker" in navigator) {
        const wasControlled = navigator.serviceWorker.controller !== null;
        const registrations = await navigator.serviceWorker.getRegistrations();
        const results = await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
        shouldReload = wasControlled && results.some(Boolean);
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      if (shouldReload) window.location.reload();
    };

    void cleanup();
  }, []);

  return null;
}
