<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UniFind agent notes

Single-page Next.js 16 (App Router), React 19, Turbopack. Styling is Material UI v9 + Emotion only — Tailwind was fully removed.

## Commands
- `npm run dev` — dev server on port 3000, host 0.0.0.0
- `npm run build` — production build (Turbopack)
- `npm run lint` — eslint (nextVitals + nextTs rules)

No test script, no CI workflows, no pre-commit hooks.

## Architecture (read before touching styling)
- `app/layout.tsx` — Server Component. Owns `<html>`/`<body>`, `metadata` export, `next/font` Geist, and wraps `{children}` in `AppRouterCacheProvider`. Must stay a Server Component: `metadata` cannot be exported from `"use client"`.
- `app/components/Header.tsx` — `"use client"`. Owns MUI `ThemeProvider` + `CssBaseline` + all UI (`AppBar`, `Drawer`, `TextField`, …). Direct child of `<body>` in layout.
- `app/page.tsx` — renders `<Header />` only.
- `app/globals.css` — plain CSS color variables only. No `@import "tailwindcss"`, no `@theme inline`.

## Hard-learned gotchas (these caused real build/runtime errors)
- MUI styling is Emotion-based; it **requires** `<AppRouterCacheProvider>` (from `@mui/material-nextjs/v16-appRouter`) wrapped around `{children}` in `layout.tsx`. Without it, Emotion injects inline `<style data-emotion>` tags into `<body>` during SSR and React throws "Hydration failed because the server rendered HTML didn't match the client". Keep the package version in lockstep with `@mui/material` (both `9.5.0`).
- Do **not** insert an intermediate `"use client"` wrapper (e.g. a `ThemeProvider` component) between `layout.tsx` and `page.tsx`. Passing a MUI theme object across the Server → Client boundary during static prerendering causes "multiple renderers" / "Unexpected Fiber popped" errors. Keep `ThemeProvider` inside `Header.tsx`, directly under `<body>`.
- Do **not** call hooks at module scope in a Client Component (`useMemo` at file level threw "Invalid hook call"). `createTheme()` at module scope is fine — no hook needed.
- No `tailwind.config.js` ever existed (Tailwind v4 configured via CSS import). Do not re-add `@import "tailwindcss"` or Tailwind utility classes; the build has no Tailwind loader.

## Verifying SSR style placement
After a build, `\.next/server/app/index.html` should contain all `data-emotion` `<style>` tags inside `<head>` and **zero** inside `<body>`. A body-level `data-emotion` tag means the Emotion cache is misconfigured.

## Paths / imports
- `@/*` maps to repo root (tsconfig `paths`).
- Slideshow images live in `public/img/` and are auto-discovered at build time: `app/page.tsx` (Server Component) reads the folder with `fs.readdirSync` and passes `/img/*.png` URLs to `<Slideshow slides={...} />`. Drop a new image in `public/img/` (no code change) — the ring radius and angle are derived from the count in `Slideshow.tsx`. In `next dev` new files appear on refresh; production needs a rebuild.
- MUI theme background colors: `#D8F3DC` (default/paper), primary `#081C15`. Typography references `var(--font-geist-sans)`.
