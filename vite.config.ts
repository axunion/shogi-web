import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

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
});
