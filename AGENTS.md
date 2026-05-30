# AGENTS.md

Guidance for AI agents working in this repository.

## Cursor Cloud specific instructions

### Product

Single-package **QA Studio** app (SvelteKit 2 + Svelte 5 + Prisma + PostgreSQL). Not a monorepo. Dev server binds **port 3000** (`vite.config.ts`); README still mentions 5173 in places.

### Required environment variables

The VM typically provides these via injected secrets (no `.env.local` required if set at process level):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (Neon or local) |
| `SESSION_SECRET` | Session HMAC |
| `TOTP_ENCRYPTION_KEY` | 64 hex chars (`openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for attachments |
| `ENCRYPTION_KEY`, `URL_SIGNING_SECRET` | Integrations / signed trace URLs |

Optional but common: Upstash Redis REST URL/token (`KV_*`); caching is disabled in dev if unset. Set self-hosted mode (`SELF_HOSTED=true`) to skip Stripe/subscription gates for local full-feature testing.

See `.env.example` for the full list.

### Paraglide (i18n)

`src/lib/paraglide` is gitignored and **not** created by `npm install` alone. Before `npm run check` or if the dev server returns 500 with missing `$lib/paraglide/*` modules, run:

```bash
npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
```

`npm run dev` also compiles via the Vite plugin once the server starts.

### Services

| Service | Local dev |
|---------|-----------|
| **App** | `npm run dev` (port 3000) |
| **PostgreSQL** | Use `DATABASE_URL` from env, or `docker compose up postgres` (Docker optional) |
| **Playwright E2E** | Default config hits production `the hosted deployment`; local E2E needs `webServer` + credentials in `playwright.config.ts` |

Docker Compose (`npm run docker:dev`) includes Redis/MinIO/MailHog, but the app code uses **Upstash** (`KV_*`) and **Vercel Blob**, not the compose Redis/MinIO env vars.

### Standard commands

| Task | Command |
|------|---------|
| Install | `npm install` |
| DB schema | `npx prisma migrate deploy` (or `db push` for throwaway DBs) |
| Lint | `npm run lint` (large pre-existing eslint backlog in repo) |
| Typecheck | `npm run check` |
| Unit tests | `npm run test:unit -- --run` |
| Build | `npm run build` |
| Dev | `npm run dev` |

### Long-running processes

Use **tmux** (`tmux -f /exec-daemon/tmux.portal.conf`) for `npm run dev` and other background servers so sessions survive agent disconnects.

### Gotchas

- `postinstall` runs `prisma generate` but may skip if `.svelte-kit` is missing; run `npx svelte-kit sync` first on a clean clone.
- Lint reports many `svelte/no-navigation-without-resolve` issues repo-wide; do not treat as introduced by your change unless you touched those files.
- Default `npm run test:e2e` does **not** start a local server.
