import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const isCapacitor = process.env.BUILD_TARGET === "capacitor";
const base = isCapacitor ? "./" : "/NOCTISEA/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "NOCTIS EA",
        short_name: "NOCTIS EA",
        description: "Premium automated trading system — ITRADE XXIV",
        theme_color: "#0A0A0C",
        background_color: "#0A0A0C",
        display: "standalone",
        orientation: "portrait",
        scope: isCapacitor ? "/" : "/NOCTISEA/",
        start_url: isCapacitor ? "/" : "/NOCTISEA/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/ws":  { target: "ws://localhost:3001", ws: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
