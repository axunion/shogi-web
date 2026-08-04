import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

// Required for SharedArrayBuffer, which the YaneuraOu.wasm engine needs for
// WebAssembly threads. Must also be set by the production host.
const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [solid()],
  css: {
    transformer: "lightningcss",
  },
  build: {
    cssMinify: "lightningcss",
  },
  server: {
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
  // vite-plugin-solid defaults test.environment to "jsdom" when unset.
  // Pin it explicitly to happy-dom (lighter/faster) instead.
  test: {
    environment: "happy-dom",
    // e2e/*.spec.ts are Playwright specs (run via `pnpm test:e2e`), not
    // Vitest ones, but their filenames match Vitest's default spec glob.
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
