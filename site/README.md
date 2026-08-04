# Shard-sea Codex — website

An Astro 5 + Tailwind v4 wiki for **Kriegsmesser**, generated from `../shardsea.db`.
Same layout and functionality as the D&D 3.5 Codex, deployed privately and separately
on Cloudflare Pages.

## Develop

```bash
cd site
npm install
npm run export     # regenerate JSON from ../shardsea.db (needs Node 22+)
npm run start      # astro dev on http://localhost:4321 (auth is bypassed locally)
npm run build      # production build into dist/
```

The exported JSON (`src/data/`, `public/data/`) is **committed**, so the site builds with
no database present. Re-run `npm run export` after any DB import to refresh it.

## How it maps to the DB

- `scripts/export-data.mjs` — reads the hybrid schema (entity + typed tables + page) and
  emits `src/data/<kind>.json` (full), `public/data/<kind>.index.json` (browse), `search.json`,
  `meta.json`, and `changes.json` (versions + changelog).
- `src/lib/sections.ts` — the section registry (kinds → route/label/group/facets).
- `src/components/detail/*` — one component per kind; `src/lib/md.ts` renders the prose pages.
- `src/pages/changelog.astro` — the detailed, per-version changelog.

## Deploy (Cloudflare Pages) — one-time setup

CI is push-to-deploy via `.github/workflows/deploy.yml` **at the repo root** (GitHub only runs
root workflows). It builds `site/` and deploys to the Pages project **`shard-sea-codex`**.

1. **GitHub:** add repo secret `CLOUDFLARE_API_TOKEN` (permission: *Account · Cloudflare Pages · Edit*).
   The next push to `main` (or a manual run of the workflow) builds and deploys — `wrangler pages
   deploy` creates the `shard-sea-codex` project on first run.
2. **Cloudflare:** set two secrets on the Pages project (the auth middleware fails **closed** with
   HTTP 503 until both exist):
   ```bash
   npx wrangler pages secret put SITE_PASSWORD  --project-name shard-sea-codex   # value: the site password
   npx wrangler pages secret put SESSION_SECRET --project-name shard-sea-codex   # value: a fresh random hex string
   ```
   Use a **different** `SESSION_SECRET` from the local `.dev.vars` one.
3. **Manual deploy** (optional fallback): `npx wrangler login` once (interactive), then `npm run deploy`.

## Auth

`functions/_middleware.js` gates every request behind a password, issuing an HMAC-signed
30-day session cookie. The password is never in the repo: locally it comes from `.dev.vars`
(gitignored); in production from the `SITE_PASSWORD` Cloudflare secret. `astro dev` bypasses
Functions, so local development needs no login; test the gate with `npm run auth:dev`
(`wrangler pages dev`, reads `.dev.vars`).
