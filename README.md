# vite-solid-template

A minimal template for building [Solid](https://solidjs.com) apps with [Vite](https://vite.dev).

## Features

- [Solid](https://solidjs.com) with TypeScript
- [Vite](https://vite.dev) with [Lightning CSS](https://lightningcss.dev) for CSS transforms and minification
- [Biome](https://biomejs.dev) for linting and formatting (Solid rules enabled)
- [Vitest](https://vitest.dev) for testing (jsdom environment)
- [lefthook](https://lefthook.dev) git hooks: format on commit, check and test on push
- [Kobalte](https://kobalte.dev) and [Lucide](https://lucide.dev) for UI components and icons

## Requirements

- Node.js 24 (see `.node-version`)
- pnpm

## Getting Started

```bash
pnpm install
```

This also installs the git hooks.

## Scripts

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Start the dev server                     |
| `pnpm build`   | Type-check and build for production      |
| `pnpm preview` | Preview the production build             |
| `pnpm test`    | Run tests                                |
| `pnpm check`   | Lint, format check, and type-check       |
| `pnpm fix`     | Fix lint and format issues automatically |

## Deployment

The shogi engine (`@mizarjp/yaneuraou.k-p`) uses WebAssembly threads, which require
`SharedArrayBuffer`. The production host must send these headers on the top-level
response (already configured for `pnpm dev` / `pnpm preview` in `vite.config.ts`):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without them, `window.crossOriginIsolated` will be `false` and the engine will fail
to start. Check the host's static-hosting docs for how to set custom response headers
(e.g. Netlify's `_headers` file, Cloudflare Pages' `_headers` file).

### Vendored engine files

`public/engine/` contains a copy of `@mizarjp/yaneuraou.k-p`'s `lib/yaneuraou.k-p.{js,wasm}`
and `lib/yaneuraou.k-p.worker.js`. Vite's bundler-mode module graph can't reliably resolve
this package's wasm/worker sibling assets when it's imported directly, so the engine worker
(`src/engine/engine.worker.ts`) fetches these files from `public/engine/` at runtime instead
of importing the package. When upgrading `@mizarjp/yaneuraou.k-p`, re-copy those three files
from the new version's `lib/` directory into `public/engine/`.
