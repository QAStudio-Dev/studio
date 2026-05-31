# Performance baseline notes

Recorded during the page-load optimization work (May 2026). Re-run after major changes.

## How to measure

```bash
npm install
npx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide
npm run build
ANALYZE=true npm run build   # writes build-stats.html at repo root
```

Use Lighthouse (mobile + desktop) on:

- `/` (prerendered marketing home)
- `/dashboard` (authenticated; requires login)
- `/projects/{projectId}/cases` (heavy list route)

## Build output (client chunks)

Run `npm run build` and inspect `.svelte-kit/output/client/_app/immutable/chunks/` for gzip sizes. With `ANALYZE=true`, open `build-stats.html` for treemap.

## Optimizations applied

- Layout: minimal user query + cached accessible projects for nav
- Dashboard: SSR via `loadDashboardData` (no client waterfall on first paint)
- Cases list: exclude `steps` JSON from list payload
- Healing: SQL aggregates + limited recent rows
- Runs API: single `groupBy` for all run stats on a page
- Client: dynamic import for `html5-qrcode`, `marked`, heavy run/case components
- gtag deferred via `requestIdleCallback`
- Fira Mono subset (400 only) in global CSS

## Suggested success metrics

| Metric                        | Target direction                                 |
| ----------------------------- | ------------------------------------------------ |
| TTFB on `/projects/.../cases` | Lower after slimmer Prisma selects               |
| LCP on `/dashboard`           | Lower after SSR (no empty loading shell)         |
| First-load JS                 | Lower after code-splitting + removed unused deps |
