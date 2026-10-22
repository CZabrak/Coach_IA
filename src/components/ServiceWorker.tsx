"use client";

import { useEffect } from "react";

// Le service worker n'est actif qu'en production pour ne pas mettre en cache les chunks de dev.
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
