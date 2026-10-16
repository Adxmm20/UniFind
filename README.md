# UniFind

A university discovery and comparison platform. UniFind brings campus events,
rentals and services into one catalogue, with search, bookmarks, profiles,
posting and a floating AI assistant that explains any listing.

Built as a single Next.js 16 (App Router) application on React 19, styled only
with Material UI v9 + Emotion, backed by SQLite through Node's built-in
`node:sqlite` — no ORM and no native add-ons.

---

## Features

- **Home catalogue** — Events, Rentals and Services in one tabbed grid, with a
  per-tab category filter, location filter, STAR-points filter and sort.
- **Search** — ranked, typo-tolerant search over titles, descriptions, categories,
  venues and poster handles (`/search?q=…`), plus as-you-type suggestions through
  `GET /api/suggest`.
- **Details pages** — image gallery, description, facts and organiser/provider
  info for every record (`/details/[id]`).
- **Profiles** — every poster gets a page listing their events, listings and
  reviews (`/[username]`), reachable by handle or email local-part.
- **Accounts & auth** — email/password sign-up and sign-in with scrypt hashing
  and a signed `httpOnly` session cookie, implemented with `node:crypto`.
- **Bookmarks** — save any record, with a grid/list view and filtering/sorting.
- **Posting** — publish a new event, rental or service, including a picture
  upload, with server-side validation.
- **AI assistant** — a floating assistant on every details page that can
  summarise a listing, list key points or draft an outreach message (Gemini).
- **Accessibility tools** — a full panel of preferences: light/dark/system theme,
  colour-blindness filters, an 11-step text-size stepper, reduce motion, high
  contrast, read-aloud on hover, and text spacing.

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack, PPR/cacheComponents) |
| UI         | React 19, Material UI v9, Emotion                    |
| Language   | TypeScript                                           |
| Database   | SQLite via `node:sqlite` (no ORM, synchronous reads) |
| Auth       | `node:crypto` (scrypt + signed cookie)               |
| AI         | Google Gemini `generateContent` REST API             |

Tailwind is deliberately absent — styling is Material UI + Emotion plus a CSS
custom-property token layer in `app/globals.css`.

## Getting started

### Requirements

- **Node.js ≥ 22.5** (for `node:sqlite`); developed on Node 24.
- npm.

### Install and run

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000) (bound to
`0.0.0.0`). `predev` seeds the database automatically.

### Build

```bash
npm run build
npm run start
```

`prebuild` seeds the database too, and the build emits a `standalone` server.

## Environment variables

All optional for local development — the app runs without them and degrades
gracefully. Put them in `.env.local` (gitignored).

| Variable           | Purpose                                                                 | Default                    |
| ------------------ | ----------------------------------------------------------------------- | -------------------------- |
| `AUTH_SECRET`      | Signs the session cookie. **Set a real value before deploying.**        | dev fallback in code       |
| `GEMINI_API_KEY`   | Enables the details-page AI assistant. Without it the panel shows a "not set up yet" message. | —        |
| `GEMINI_MODEL`     | Overrides the Gemini model used by the assistant.                       | `gemini-3.5-flash-lite`    |
| `UNIFIND_DB_PATH`  | Overrides the SQLite file path.                                         | `data/unifind.db`          |

> **Do not use a `gemini-2.5-*` model with a new API key.** Google limits that
> family to keys that already used it, so `generateContent` returns `404` even
> though the models list still advertises it. Use a current model
> (e.g. `gemini-3.8-flash`) or leave `GEMINI_MODEL` unset.

## Demo accounts

Every seeded account uses the password **`unifind123`**.

The login field accepts **either** the full email or the handle (the email
local-part), so both of these sign in as the same account:

- `josa_organizer@live.iium.edu.my`
- `josa_organizer`

Other useful handles: `iheal_organizer`, `car_rentals`, `photo_studio`,
`peer_tutor`, `byic_organizer`.

## Scripts

| Script            | What it does                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| `npm run dev`     | Dev server on port 3000 (`predev` seeds a missing DB).                       |
| `npm run build`   | Production build (`prebuild` seeds a missing DB).                            |
| `npm run start`   | Serves the production build.                                                 |
| `npm run lint`    | ESLint (`eslint-config-next` core-web-vitals + TypeScript rules).            |
| `npm run db:seed` | Creates `data/unifind.db` from `db/schema.sql` + `db/seed.sql`. **Non-destructive** — an existing DB is left alone. |
| `npm run db:reset`| Drops and recreates every table (`db:seed --force`). Use after editing the schema or seed. |

Because seeding is non-destructive, accounts created at runtime survive
restarts. It also means a stale database is **not** repaired automatically —
run `npm run db:reset` after changing `db/schema.sql` or `db/seed.sql`.

## Routes

| Route            | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `/`              | Home — hero slideshow and the Events/Rentals/Services catalogue.   |
| `/search`        | Search results (`?q=…`), grouped by record kind, with people chips.|
| `/details/[id]`  | Record details, e.g. `/details/event-1` or `/details/item-10`.     |
| `/[username]`    | Profile page, e.g. `/josa_organizer`.                              |
| `/bookmarks`     | Saved records (signed-in only).                                    |
| `/post`          | Create a new event/rental/service (signed-in only).                |
| `/about`         | About page and team.                                               |
| `/api/suggest`   | `GET` — as-you-type search suggestions (JSON).                     |

> The request-time proxy (`proxy.ts`) treats any unknown single-segment path as a
> profile username and returns a real 404. **A new top-level route must be added
> to its matcher**, or it will be mistaken for a username.

## Project structure

```
app/
  page.tsx                 Home catalogue + slideshow
  layout.tsx               Root layout: fonts, a11y provider, cookie-driven <html>
  [username]/              Profile route
  about/                   About page
  bookmarks/               Bookmarks page
  post/                    Posting page
  search/                  Search results
  details/[id]/            Record details route
  api/suggest/             The one route handler
  actions/                 Server actions (auth, bookmarks, posts, ai)
  components/              All UI (cards, header, details, post, profile, a11y, icons)
lib/                       Server/domain logic (db, auth, queries, search, format, …)
db/                        schema.sql, seed.sql, dump
scripts/seed-db.mjs        Database seeder (node:sqlite)
public/img/                Events, Rental, Services, trending, pfp, icon
data/unifind.db            Generated SQLite database (gitignored)
```

## Data and images

- Tables: `users`, `events`, `items` (rentals **and** services), `event_rsvps`,
  `bookmarks`, `reviews`.
- Every record has a canonical id (`event-1`, `item-4`) and its picture is named
  after that stem: `public/img/Events/event-1.jpg`. Rentals live in
  `public/img/Rental/`, services in `public/img/Services/` (a service's stem is
  `service-<n>`), and pages resolve pictures by name through an image index — so
  reordering rows never shifts which picture a card gets.
- Reading uses a read-only connection (`getDb()`); only signup, bookmark toggles
  and posting write, through `getWriteDb()`.
- Seed data comes from a phpMyAdmin dump merged into the live database; all
  timestamps are stored and rendered as UTC.

## Accessibility

The drawer's accessibility panel (open anywhere with **Alt+A**) controls theme,
colour-blindness filters, an 11-step text-size stepper, reduced motion, high
contrast, read-aloud on hover, text spacing and a reset. Preferences live in a
cookie and are written onto `<html>` **by the server**, so the correct theme and
filter are present in the first paint with no flash and no hydration mismatch.
The app also ships skip links, landmarks and keyboard-reachable controls
throughout.

## The AI assistant

On any details page a launcher opens a small, non-modal panel with three presets
(**Summarise**, **Key points**, **Draft a message**) plus a free-text field. It is
signed-in only, re-reads the record on the server so the client never supplies
the listing text, and stores nothing — conversation history is client state only.
The only outbound network call in the app is to Gemini's `generateContent`
endpoint (`lib/ai.ts`), authenticated with the key in a header.

## Deployment notes

- The build uses `output: "standalone"` and traces `./data/**` into the output,
  so the seeded database ships with the server.
- **Set a real `AUTH_SECRET`** before exposing the app anywhere.
- A picture uploaded through `/post` is written into the working tree under
  `public/img/`. That is fine for `next dev` and a local `next start`, but a
  deployment with an immutable or read-only filesystem needs an object store
  instead.
- `/api/suggest` and every page render per request (the app blocks on the session
  cookie on purpose), so there is no static-only deployment path.

## Further reading

`AGENTS.md` documents the architecture in depth — the token layer, the search
matcher, the accessibility plumbing, the proxy rules and the many
framework-specific gotchas this project has hit. Read it before making
structural changes.
