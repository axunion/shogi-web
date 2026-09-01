import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// public/_headers is what makes window.crossOriginIsolated true on
// Cloudflare Pages, which the YaneuraOu.wasm engine needs to run at all.
// It's plain static config with no build-time check, so a silent regression
// here surfaces only as a confusing "Engine search timed out" in production.
const headersPath = join(process.cwd(), "public/_headers");

describe("public/_headers", () => {
  it("sets the cross-origin isolation headers the wasm engine needs", () => {
    const contents = readFileSync(headersPath, "utf-8");
    expect(contents).toMatch(/Cross-Origin-Opener-Policy:\s*same-origin/);
    expect(contents).toMatch(/Cross-Origin-Embedder-Policy:\s*require-corp/);
  });
});
