import type { MetadataRoute } from "next";

import {
  APP_BACKGROUND_COLOR,
  APP_FULL_NAME,
  APP_LONG_DESCRIPTION,
  APP_NAME,
  APP_THEME_COLOR,
} from "@/lib/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=pwa",
    name: APP_FULL_NAME,
    short_name: APP_NAME,
    description: APP_LONG_DESCRIPTION,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: APP_BACKGROUND_COLOR,
    theme_color: APP_THEME_COLOR,
    categories: ["productivity", "lifestyle", "utilities"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
