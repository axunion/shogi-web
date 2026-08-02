---
name: sync-engine-assets
description: Re-copies the yaneuraou.k-p engine's built lib files into public/engine after upgrading the @mizarjp/yaneuraou.k-p package. Use only when the user explicitly asks to update/sync the engine assets — not automatically on every dependency bump.
disable-model-invocation: true
---

# Sync engine assets

`public/engine/` holds a vendored copy of `@mizarjp/yaneuraou.k-p`'s
`lib/yaneuraou.k-p.{js,wasm}` and `lib/yaneuraou.k-p.worker.js` (see README's "Vendored
engine files" section). Vite can't resolve this package's wasm/worker siblings when
imported directly, so `src/engine/engine.worker.ts` fetches these three files from
`public/engine/` at runtime instead.

## Steps

1. Confirm the package version actually changed: compare the installed version
   (`node_modules/@mizarjp/yaneuraou.k-p/package.json`'s `version`) against what's
   currently vendored (there's no version marker in `public/engine/` itself, so diff
   file sizes/hashes against `node_modules/@mizarjp/yaneuraou.k-p/lib/` as a sanity
   check before overwriting).
2. Copy exactly these three files from `node_modules/@mizarjp/yaneuraou.k-p/lib/` to
   `public/engine/`, overwriting what's there:
   - `yaneuraou.k-p.js`
   - `yaneuraou.k-p.wasm`
   - `yaneuraou.k-p.worker.js`
3. Do not rename or restructure — `engine.worker.ts` fetches these by exact filename.
4. Run `pnpm dev` (or `pnpm build`) and verify the engine actually starts (no
   `window.crossOriginIsolated` errors, engine responds to a new-game request) before
   considering the sync done.
5. Remind the user that `@mizarjp/yaneuraou.k-p` is GPL-3.0 (per README's "Engine
   license" section) — this only matters for redistribution, not local dev, but flag it
   if the sync is happening as part of a deploy.

## Out of scope

This skill only re-copies files after a package upgrade already happened (e.g. `pnpm
add @mizarjp/yaneuraou.k-p@latest`). It does not run the package upgrade itself unless
the user asks for that too.
