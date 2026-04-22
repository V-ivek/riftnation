# Catalog sync runbook

## What it does

`sync-catalog` pulls the official Riftbound card catalog from
`https://riftbound.leagueoflegends.com/en-us/card-gallery/` into the
Postgres database behind the `catalog` bounded context. The job runs
daily at **07:00 UTC** (11:00 Asia/Dubai). Output is a single JSON line
on stdout summarizing what changed.

## Required configuration

### GitHub repo secrets

| Secret | Value |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon, Supabase, RDS, etc.). Must be reachable from GitHub-hosted runners. |

Set via `gh secret set DATABASE_URL` or the repo Settings → Secrets UI.

### Optional env

| Name | Default | Notes |
|---|---|---|
| `RIFTBOUND_GALLERY_URL` | `https://riftbound.leagueoflegends.com/en-us/card-gallery/` | Only override when testing against a mirror. |
| `CI_SKIP_PLAYWRIGHT` | `1` in the workflow | Skips the Playwright fallback spec in tests; has no effect on the actual sync. |

## Running the sync locally

```sh
# One-time (if you need the fallback path locally)
npx playwright install chromium

# Set your local env
export DATABASE_URL='postgres://user:pass@host:5432/db'

npm ci
npm run migrate
npm run sync:catalog
```

Expected output on success:

```json
{"ok":true,"sets":{"seen":5,"added":0,"updated":0,"unchanged":5},"cards":{"seen":950,"added":0,"updated":3,"unchanged":947,"tombstoned":0,"restored":0},"fetchedVia":"next-data","embeddedCount":950,"totalItems":955,"durationMs":1234}
```

Nonzero exit code with `{"ok":false,"error":"..."}` on stderr means the
run failed and the transaction rolled back — rerun safely.

## Manually triggering the workflow

```sh
gh workflow run sync-catalog.yml
# tail the run
gh run watch
```

From the GitHub UI: Actions → sync-catalog → Run workflow.

## Reading the summary line

The workflow's "Sync catalog" step prints exactly one JSON line on
success. Look for:

- `cards.seen` — total cards in the snapshot
- `cards.added` — new cards persisted
- `cards.updated` — cards whose normalized fields changed
- `cards.unchanged` — cards present in both DB and snapshot with no field drift
- `cards.tombstoned` — cards that disappeared upstream; `deleted_at` is now set
- `cards.restored` — previously tombstoned cards that re-appeared
- `embeddedCount` vs `totalItems` — how many cards shipped inline in `__NEXT_DATA__` vs how many Riot says exist total
- `fetchedVia` — `next-data` means the primary HTTP path won; `playwright` means the fallback kicked in

## Gap alarm — when `embeddedCount < totalItems`

The default threshold is 20. If `totalItems - embeddedCount > 20`,
`CompositeSourceClient` automatically invokes the Playwright fallback
and merges. If this happens:

1. Note the ratio in the logs (e.g., `embedded=930 total=955 gap=25`).
2. If sustained for several runs, consider raising the fallback's
   concurrency-safety or pre-installing Chromium in CI by removing
   `CI_SKIP_PLAYWRIGHT=1` and adding `npx playwright install --with-deps chromium`.
3. If the gap grows past 100, open an issue — Riot may have changed
   their SSR strategy and the mapper may need updates.

## When the sync fails

1. Look at the failed workflow run in Actions.
2. The error envelope on stderr shows the cause:
   - **Network / 5xx** — Riot or CDN is down; retry manually later.
   - **`riftboundCardGallery blade not found`** — Riot changed the page
     shape. Refresh the fixture (`test/fixtures/gallery-min.html`)
     against the current HTML and adjust `RiotSourceMapper` if
     necessary.
   - **VO invariant failures** (e.g., `Orientation must be one of …`) —
     Riot added a new allowed value; extend the relevant VO and
     re-release. The transaction rolls back, so the DB stays consistent.
3. Re-run via `gh workflow run sync-catalog.yml`; the job is idempotent.

## When something unexpected looks persisted

Read the Neon / Supabase console directly. Handy queries:

```sql
-- Cards updated in the latest run
SELECT id, name, synced_at FROM cards ORDER BY synced_at DESC LIMIT 20;

-- Tombstones
SELECT id, name, deleted_at FROM cards WHERE deleted_at IS NOT NULL;

-- Recently tombstoned (candidates for an alert)
SELECT id, name, deleted_at FROM cards
 WHERE deleted_at > now() - interval '2 days';

-- Gap alert — too many cards disappeared in one run
SELECT date_trunc('day', deleted_at) AS day, COUNT(*) AS tombstoned
  FROM cards WHERE deleted_at IS NOT NULL
GROUP BY 1 ORDER BY 1 DESC;
```

Hard-deletion is never performed; tombstones are the only removal
mechanism. Restores happen automatically when a card re-appears
upstream.
