# Deployment Guide

This guide covers how to deploy QA Studio in production. For day-to-day Docker development (logs, database backups, troubleshooting), see [DOCKER.md](DOCKER.md).

## Choose a deployment path

| Path                                           | Best for                                 | Complexity  |
| ---------------------------------------------- | ---------------------------------------- | ----------- |
| [Vercel](#vercel-recommended-for-hosted-saas)  | Hosted SaaS, fastest path to production  | Low         |
| [Docker](#docker-recommended-for-self-hosting) | Private infrastructure, all-in-one stack | Medium      |
| [Node.js / VPS](#nodejs-vps-or-any-node-host)  | Custom servers, Kubernetes, existing ops | Medium–High |

All paths require **PostgreSQL**. Most production deployments also use **Vercel Blob** (attachments) and **Upstash Redis** (caching and rate limits). See [External services](#external-services) below.

---

## Prerequisites (all deployments)

1. **PostgreSQL 14+** — application database (`DATABASE_URL`)
2. **Cryptographic secrets** — generate before going live:

    ```bash
    # Session signing (base64)
    node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

    # 32-byte hex keys (TOTP, integrations, URL signing)
    openssl rand -hex 32
    ```

3. **Copy environment template**

    ```bash
    cp .env.example .env.local   # local / manual installs
    # or configure vars in your host (Vercel dashboard, Docker .env, etc.)
    ```

### Required variables (production)

| Variable                | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                                          |
| `SESSION_SECRET`        | HMAC signing for sessions (no default in production)                  |
| `TOTP_ENCRYPTION_KEY`   | 64 hex chars — encrypts shared 2FA secrets                            |
| `ENCRYPTION_KEY`        | 64 hex chars — encrypts integration credentials                       |
| `URL_SIGNING_SECRET`    | 64 hex chars — signed URLs for Playwright traces                      |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — test attachments (screenshots, videos, traces)          |
| `KV_REST_API_URL`       | Upstash Redis REST URL (caching; required when `NODE_ENV=production`) |
| `KV_REST_API_TOKEN`     | Upstash Redis REST token                                              |
| `CRON_SECRET`           | Authenticates scheduled job HTTP calls                                |

### Self-hosted vs SaaS

| Mode            | Set                           | Stripe                                            | Feature limits           |
| --------------- | ----------------------------- | ------------------------------------------------- | ------------------------ |
| **Self-hosted** | `SELF_HOSTED=true`            | Not required                                      | Unlimited users/projects |
| **Hosted SaaS** | `SELF_HOSTED=false` (default) | Required — see [STRIPE_SETUP.md](STRIPE_SETUP.md) | Per plan                 |

See [SELF_HOSTED.md](../SELF_HOSTED.md) for security notes and behavior.

Full variable reference: [.env.example](../.env.example).

---

## External services

QA Studio’s application code currently integrates with these managed services (even when you run the app in Docker):

| Service           | Env vars                               | Used for                             |
| ----------------- | -------------------------------------- | ------------------------------------ |
| **Vercel Blob**   | `BLOB_READ_WRITE_TOKEN`                | Uploading/deleting test attachments  |
| **Upstash Redis** | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | API caching, distributed rate limits |

> **Note:** `docker-compose.yml` includes Redis and MinIO containers for local infrastructure, but the app reads **Upstash** and **Vercel Blob** env vars today—not `REDIS_URL` or `S3_*` from Compose. For a fully offline stack, implement a storage adapter in `src/lib/server/blob-storage.ts` (see README “Alternative for Self-Hosting”).

Optional but common:

- **SMTP** (`EMAIL_*`) — password reset, invitations — [EMAIL_SETUP.md](EMAIL_SETUP.md)
- **OpenAI** (`OPENAI_SECRET_KEY`) — AI trace analysis
- **Stripe** — SaaS billing only — [STRIPE_SETUP.md](STRIPE_SETUP.md)

---

## Vercel (recommended for hosted SaaS)

The repo uses `@sveltejs/adapter-vercel` and includes `vercel.json` cron schedules.

### Steps

1. **Import the repository** in [Vercel](https://vercel.com/new) (or use the README deploy button).

2. **Add a Postgres database** (Vercel Postgres / Neon) and set `DATABASE_URL`.

3. **Add storage & cache**
    - Vercel Dashboard → Storage → **Blob** → create store → copy `BLOB_READ_WRITE_TOKEN`
    - Storage → **Redis (Upstash)** → copy `KV_REST_API_URL` and `KV_REST_API_TOKEN`

4. **Set secrets** in Project → Settings → Environment Variables (at minimum the [required variables](#required-variables-production) above).

5. **Configure mode**
    - SaaS: `SELF_HOSTED=false` + Stripe vars from [STRIPE_SETUP.md](STRIPE_SETUP.md)
    - Private org on Vercel: `SELF_HOSTED=true` (skips billing checks)

6. **Deploy** — Vercel runs `npm run build` and applies Prisma migrations via your build settings if configured.

7. **Verify crons** — Project → Settings → Cron Jobs should show:

    | Schedule      | Endpoint                        |
    | ------------- | ------------------------------- |
    | `0 2 * * *`   | `/api/cron/cleanup-attachments` |
    | `0 */6 * * *` | `/api/cron/cleanup-sessions`    |
    | `0 3 * * *`   | `/api/cron/backup-database`     |

    Cron requests must send `Authorization: Bearer <CRON_SECRET>`.

8. **Set public URL** — `PUBLIC_BASE_URL` / `PUBLIC_APP_URL` to your production domain.

### After deploy

- Run `npx prisma migrate deploy` if migrations are not part of your build pipeline.
- Create the first user via the signup flow (or your org’s onboarding process).
- Confirm email delivery if using `EMAIL_*` vars.

---

## Docker (recommended for self-hosting)

Docker Compose runs PostgreSQL, optional MailHog (dev), and the QA Studio app. Production uses a compiled image (`docker-compose.prod.yml`).

### Quick start (development)

```bash
git clone https://github.com/QAStudio-Dev/studio.git
cd studio

# Optional: customize passwords (see .env.docker)
cp .env.docker .env

npm run docker:dev:build
```

Open **http://localhost:3000** (dev server port is 3000, not 5173).

Add cloud service tokens to `.env` or `docker-compose` overrides if you need attachments and production-grade caching:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
KV_REST_API_URL=https://....upstash.io
KV_REST_API_TOKEN=...
TOTP_ENCRYPTION_KEY=<64 hex chars>
ENCRYPTION_KEY=<64 hex chars>
URL_SIGNING_SECRET=<64 hex chars>
```

### Production (Docker)

```bash
# 1. Create .env with strong secrets (never use .env.docker defaults)
cat > .env << 'EOF'
DB_PASSWORD=<openssl rand -base64 32>
REDIS_PASSWORD=<openssl rand -base64 32>
MINIO_PASSWORD=<openssl rand -base64 32>
SESSION_SECRET=<openssl rand -base64 32>
SELF_HOSTED=true
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
KV_REST_API_URL=https://....upstash.io
KV_REST_API_TOKEN=...
TOTP_ENCRYPTION_KEY=<64 hex>
ENCRYPTION_KEY=<64 hex>
URL_SIGNING_SECRET=<64 hex>
CRON_SECRET=<64 hex>
EOF

# 2. Build and start
npm run docker:prod:build
```

`docker-compose.prod.yml` defaults to `SELF_HOSTED=true`, runs `prisma migrate deploy`, and starts `node build` on port **3000**.

**Production checklist:**

- [ ] Strong `.env` passwords (Compose enforces `DB_PASSWORD`, `REDIS_PASSWORD`, etc.)
- [ ] Reverse proxy with HTTPS (nginx, Caddy, Traefik) — do not expose Postgres/Redis publicly
- [ ] `BLOB_READ_WRITE_TOKEN` and Upstash vars set on the `web` service
- [ ] Schedule cron endpoints (see [Scheduled jobs](#scheduled-jobs-non-vercel))
- [ ] Volume backups for `postgres-data` (see [DOCKER.md — Data Persistence](DOCKER.md#data-persistence))

**Detailed Docker docs:** [DOCKER.md](DOCKER.md) (commands, MailHog, MinIO console, backups, troubleshooting).

---

## Node.js / VPS (or any Node host)

Use any platform that can run a Node 18+ process and reach PostgreSQL.

### Build & run

```bash
git clone https://github.com/QAStudio-Dev/studio.git
cd studio
npm ci

cp .env.example .env.local
# Edit .env.local — set DATABASE_URL, secrets, SELF_HOSTED=true, etc.

npx prisma migrate deploy
npm run build
NODE_ENV=production node build
```

The app listens on port **3000** by default (`vite.config.ts`).

### Reverse proxy example (Caddy)

```caddy
qastudio.example.com {
    reverse_proxy localhost:3000
}
```

### Process manager (PM2)

```bash
pm2 start build/index.js --name qa-studio
pm2 save
```

Ensure `NODE_ENV=production` and all required env vars are in the PM2 ecosystem file or shell profile.

---

## Scheduled jobs (non-Vercel)

If you are not on Vercel, call these endpoints on a schedule with `Authorization: Bearer $CRON_SECRET`:

| Schedule (UTC) | Path                                | Purpose              |
| -------------- | ----------------------------------- | -------------------- |
| Daily 02:00    | `GET /api/cron/cleanup-attachments` | Attachment retention |
| Every 6 hours  | `GET /api/cron/cleanup-sessions`    | Expired sessions     |
| Daily 03:00    | `GET /api/cron/backup-database`     | Database backups     |

Example **cron** entry:

```cron
0 2 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron/cleanup-attachments
```

See [src/routes/api/cron/BACKUPS.md](../src/routes/api/cron/BACKUPS.md) for backup retention details.

---

## Post-deployment checklist

- [ ] `npx prisma migrate deploy` succeeded
- [ ] Health: `GET /` returns 200 behind your proxy
- [ ] Signup/login works; sessions persist (`SESSION_SECRET` set)
- [ ] Upload a test attachment (confirms `BLOB_READ_WRITE_TOKEN`)
- [ ] Cron jobs authenticated and running
- [ ] Email flows tested if `EMAIL_*` configured
- [ ] `SELF_HOSTED` matches your intent (private instance vs SaaS)

---

## Related documentation

- [DOCKER.md](DOCKER.md) — Compose services, dev workflow, backups
- [SELF_HOSTED.md](../SELF_HOSTED.md) — Self-hosted mode behavior
- [EMAIL_SETUP.md](EMAIL_SETUP.md) — SMTP configuration
- [STRIPE_SETUP.md](STRIPE_SETUP.md) — SaaS billing
- [SECURITY.md](SECURITY.md) — Hardening and secrets
- [.env.example](../.env.example) — Complete environment reference

## Support

- [GitHub Issues](https://github.com/QAStudio-Dev/studio/issues)
- [Discord](https://discord.gg/rw3UfdB9pN)
