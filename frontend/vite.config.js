import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      srcDir: "src",
      filename: "service-worker.js",
      registerType: "autoUpdate",
      strategies: "injectManifest", // <-- important change here
      injectManifest: {
        swSrc: "src/service-worker.js", // path to your custom SW
      },
      manifest: {
        name: "SD GYM",
        short_name: "SD GYM",
        description:
          "Managing gym members and attendance and their diet plans and workout plans",
        theme_color: "#024a72",
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
      },
      devOptions: {
        enabled: true, // keep SW enabled in dev
      },
    }),
  ],
});
