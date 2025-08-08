import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Using generateSW strategy (default) instead of injectManifest
      manifest: {
        name: "GYM",
        short_name: "GYM",
        description:
          "Managing gym members and attendance and thier diet plans and workout plans",
        theme_color: "#024a72",
        start_url: "/",
        scope: "/",
        id: "/",
        display: "standalone",
        background_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/gym-attendance\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "gym-api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Add custom service worker code
        swDest: "dist/sw.js",
        skipWaiting: true,
        clientsClaim: true,
        // Add event listeners for message, fetch, push, and notificationclick
        additionalManifestEntries: [],
        importScripts: ["custom-sw-events.js"],
      },
      devOptions: {
        enabled: true, // Enable SW in dev for easier testing
      },
    }),
  ],
});
