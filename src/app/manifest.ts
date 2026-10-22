import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Coach IA – Suivi d'entraînement",
    short_name: "Coach IA",
    description:
      "Journal d'entraînement avec coach IA, minuteur de repos et historique.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["fitness", "health", "sports"],
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Raccourcis visibles en appui long sur l'icône de l'app (Android)
    shortcuts: [
      {
        name: "Nouvelle séance",
        short_name: "Séance",
        url: "/?tab=session",
        icons: [{ src: "/pwa-icon-192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Repos 90 s",
        short_name: "Repos 90 s",
        url: "/?timer=90",
        icons: [{ src: "/pwa-icon-192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Coach IA",
        short_name: "Coach",
        url: "/?tab=coach",
        icons: [{ src: "/pwa-icon-192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
