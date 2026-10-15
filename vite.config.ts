import { defineConfig } from "vite";

// base: "./" makes all asset URLs relative so the app works
// both at the repo root and under a GitHub Pages sub-path
// (https://<user>.github.io/<repo>/), avoiding JS/CSS 404s.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    assetsDir: "assets",
  },
  server: {
    port: 5173,
  },
});