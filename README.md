# shogi-web

A browser-based shogi (Japanese chess) game. Play against
[YaneuraOu](https://github.com/mizarjp/YaneuraOu) running locally as
WebAssembly — no server, no network calls once the page has loaded.

## Features

- Full shogi rules: legal move generation, drops, promotion, checkmate
  detection
- New game / undo ("待った") / resign, adjustable engine thinking time, mute
- Kifu (move notation) panel, e.g. `▲7六歩`
- Mobile and desktop layouts, dark mode, localStorage save/restore across
  reloads

## Requirements

- Node.js 24 (see `.node-version`)
- pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

| Command        | Description                              |
| -------------- | ----------------------------------------- |
| `pnpm dev`     | Start the dev server                     |
| `pnpm build`   | Type-check and build for production      |
| `pnpm preview` | Preview the production build             |
| `pnpm test`    | Run tests (Vitest, node environment)     |
| `pnpm check`   | Lint, format check, and type-check       |
| `pnpm fix`     | Fix lint and format issues automatically |

## Deployment

The shogi engine (`@mizarjp/yaneuraou.k-p`) uses WebAssembly threads, which
require `SharedArrayBuffer`. The production host must send these headers on
the top-level response (already configured for `pnpm dev` / `pnpm preview`
in `vite.config.ts`):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them, `window.crossOriginIsolated` will be `false` and the engine
will fail to start. Check the host's static-hosting docs for how to set
custom response headers (e.g. Netlify's `_headers` file, Cloudflare Pages'
`_headers` file).

### Vendored engine files

`public/engine/` contains a copy of `@mizarjp/yaneuraou.k-p`'s
`lib/yaneuraou.k-p.{js,wasm}` and `lib/yaneuraou.k-p.worker.js`. Vite's
bundler-mode module graph can't reliably resolve this package's wasm/worker
sibling assets when it's imported directly, so the engine worker
(`src/engine/engine.worker.ts`) fetches these files from `public/engine/` at
runtime instead of importing the package. When upgrading
`@mizarjp/yaneuraou.k-p`, re-copy those three files from the new version's
`lib/` directory into `public/engine/`.

### Engine license

`@mizarjp/yaneuraou.k-p` (bundled in `public/engine/`) is licensed under
GPL-3.0. If you redistribute a build of this app, make sure your
distribution complies with that license (e.g. by making the corresponding
source available).

## Known limitations

- No self-checking for *uchifuzume* (pawn-drop checkmate), *sennichite*
  (repetition draw), or *jishogi* (impasse); the engine still handles these
  correctly on its own side, but the app doesn't detect or announce them
- No `同` (same-square) abbreviation in kifu notation — moves that land on
  the previous move's square are written out in full
- The player is always sente (先手); there is no side selection or
  handicap (駒落ち) play
- No online multiplayer, and no KIF/CSA file import or export
- No server-side save — all persistence is local to the browser
  (`localStorage`)
