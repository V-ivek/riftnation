# Catalog sync — design

**Date:** 2026-04-18
**Status:** approved — ready for implementation plan
**Depends on:** `docs/prompts/riftnation-catalog-ddd-rfc-nestjs.md` (v0.1 Draft) and this doc's
  companion addendum `2026-04-18-catalog-rfc-addendum-observed-fields.md`.
**Scope:** how the NestJS **Catalog** bounded context pulls official Riftbound set/card data into
  Postgres on a daily schedule. Marketplace / Listings / Collections are out of scope.

## Goal

Ship the Catalog context's **write path** end-to-end: upstream source client, application sync
service wired to the RFC's aggregates and repositories, a Nest standalone CLI entry point, TypeORM
migrations with the full observed schema, and a GitHub Actions cron that runs the sync at
11:00 Asia/Dubai daily.

## Why the RFC alone isn't enough

The RFC defines the Catalog context and the aggregate/VO/repository layout. It deliberately stops
short of specifying:

1. The concrete upstream source — how bytes actually arrive.
2. The scheduling mechanism.
3. The full card field set (it lists a minimal set; real upstream data has 8 more fields — covered
   in the addendum).
4. Which Nest entrypoint runs the daily batch (HTTP admin endpoint vs. standalone CLI).

This design fills those gaps without contradicting the RFC's tactical decisions.

## Upstream source

The card gallery at `https://riftbound.leagueoflegends.com/en-us/card-gallery/` is a Next.js SSG
page. The initial HTML ships `__NEXT_DATA__` containing a `riftboundCardGallery` blade with
`sets.items` and `cards.items` already populated at build time.

- Today's payload: **950 embedded cards against `totalItems: 955`** — five cards are hydrated
  client-side by Riot's pubhub SDK. Public JS bundles do not expose the live pubhub host, so the
  cheapest reliable fetch is the embedded HTML.
- Five defined sets: Origins (OGN), Proving Grounds (OGS), Spiritforged (SFD), Unleashed (UNL),
  VEN.
- One duplicate in the embedded payload: `ogn-121a-298` Teemo appears twice identically. Dedupe
  by `id` at map time.
- Riot's shape differs from the RFC's `source` shape — see "Source record contract" below.

## Architecture (inside the Catalog context)

The RFC's layering stays intact. This design only adds concrete classes in each layer:

```
src/catalog/
  domain/
    aggregates/
      set.aggregate.ts              # from RFC
      card.aggregate.ts             # extended per addendum
    value-objects/
      ...                           # existing + new VOs per addendum
    events/
      set-synced.event.ts
      card-synced.event.ts
      card-metadata-changed.event.ts
    repositories/
      set.repository.ts
      card.repository.ts
  application/
    commands/
      sync-catalog-batch.command.ts
    handlers/
      sync-catalog-batch.handler.ts
    services/
      catalog-sync.service.ts       # RFC + idempotency + event emission
    factories/
      set.factory.ts
      card.factory.ts
  infrastructure/
    persistence/
      entities/
        set.orm-entity.ts
        card.orm-entity.ts           # extended per addendum
      mappers/
        set.mapper.ts
        card.mapper.ts
      repositories/
        set.repository.impl.ts
        card.repository.impl.ts
      migrations/
        1713412800000-init-catalog.ts
    source/
      official-catalog-client.ts     # port
      next-data.source-client.ts     # primary adapter
      playwright.source-client.ts    # fallback adapter
      composite.source-client.ts     # primary+fallback orchestrator
      riot-source.mapper.ts          # Riot JSON → RFC source record
  api/
    controllers/
      catalog-admin.controller.ts    # manual trigger endpoints
      catalog-query.controller.ts
  catalog.module.ts

src/scripts/
  sync-catalog.cli.ts                # Nest standalone CLI entry point

.github/workflows/
  sync-catalog.yml
```

## Source client

### Port (`official-catalog-client.ts`)

```ts
export const OFFICIAL_CATALOG_CLIENT = Symbol('OFFICIAL_CATALOG_CLIENT');

export interface OfficialCatalogClient {
  fetchCatalog(): Promise<OfficialCatalogSnapshot>;
}

export interface OfficialCatalogSnapshot {
  sets: SetSourceRecord[];       // matches SetFactory.fromSource shape
  cards: CardSourceRecord[];     // matches CardFactory.fromSource shape (addendum-extended)
  meta: {
    embeddedCount: number;       // cards embedded in the HTML
    totalItems: number;          // cards upstream claims exist
    resultsUpdatedAt: string;    // from __NEXT_DATA__ metadata
    fetchedVia: 'next-data' | 'playwright';
  };
}
```

### Primary adapter — `NextDataSourceClient`

- HTTP GET the gallery page with a realistic User-Agent and modest retry/backoff (3× 1s/5s/25s).
- Extract `<script id="__NEXT_DATA__">` via cheerio; `JSON.parse`; walk to
  `props.pageProps.page.blades[type=riftboundCardGallery]`.
- Pass raw items through `RiotSourceMapper.toSourceRecord(...)` to produce RFC-shape records
  (snake_case fields: `id`, `set_id`, `collector_number`, `name`, `rarity`, `card_types`,
  `domains`, `energy_cost`, `might`, `rules_text_html`, `image_url`, `image_alt`, `illustrators`,
  plus addendum fields `public_code`, `card_super_type`, `power`, `might_bonus`, `orientation`,
  `effect_text_html`, `tags`).
- Return `OfficialCatalogSnapshot` with `fetchedVia: 'next-data'`.

### Fallback adapter — `PlaywrightSourceClient`

- Boots Chromium, loads the page, waits for hydration, reads `window.__NEXT_DATA__` plus the
  fully-populated in-memory store; runs through the same `RiotSourceMapper`.
- Installed as an optional dev dependency; CI only pulls Chromium when the fallback is needed.

### Composite orchestration — `CompositeSourceClient`

- Always runs primary.
- If `embeddedCount < totalItems - threshold` (default threshold 20), runs fallback and merges
  cards by `id`, keeping the fallback value on conflicts.
- Always logs `embeddedCount vs totalItems` so drift is visible.
- This is the binding bound to `OFFICIAL_CATALOG_CLIENT` in `CatalogModule`.

### Riot source mapping

The upstream card JSON (documented in the addendum's "Observed source shape" section) needs a
lossy extraction step before it matches the RFC source record. Key extractions:

| Target source field | Riot path |
|---|---|
| `id` | `id` |
| `set_id` | `set.value.id` |
| `collector_number` | `collectorNumber` |
| `public_code` | `publicCode` |
| `name` | `name` |
| `rarity` | `rarity.value.id` |
| `card_types` | `cardType.type[].id` |
| `card_super_type` | `cardType.superType[0].id` if present |
| `domains` | `domain.values[].id` |
| `energy_cost` | `energy.value.id` (int); else null |
| `might` | `might.value.id` (int); else null |
| `power` | `power.value.id` (int); else null |
| `might_bonus` | `mightBonus.value.id` (int); else null |
| `orientation` | `orientation` |
| `rules_text_html` | `text.richText.body` |
| `effect_text_html` | `effect.richText.body` if present |
| `image_url` | `cardImage.url` |
| `image_alt` | `cardImage.accessibilityText` |
| `illustrators` | `illustrator.values[].label` |
| `tags` | `tags.tags` (already string[]) |
| `raw` | the entire Riot card object, untouched |

**Sets** (`sets.items`): `id`, `name`, `collectorNumberMax` → `collector_number_max`; `raw` = the
whole set object.

## Application service: `CatalogSyncService`

Extends the RFC's skeleton with:

- A `syncBatch(snapshot: OfficialCatalogSnapshot): Promise<SyncSummary>` method — the batch
  entrypoint both the admin controller and the CLI call.
- **Transactional write**. The batch runs inside a TypeORM transaction — all sets first, then all
  cards — so a mid-run failure leaves the DB untouched.
- **Idempotency**: before saving a card, the service compares each normalized field to the
  persisted aggregate. If nothing changed, the save is skipped (no TOUCH to `synced_at` either).
  Aggregate emits `CardSynced`; if any normalized field differs, it also emits
  `CardMetadataChanged`. This satisfies RFC §14.2 and §14.5.
- **Soft-delete tombstones**. For cards present in the DB but absent from the snapshot, the
  service stamps `deleted_at = now()` (never a hard DELETE). Re-appearance clears the tombstone.
- Returns a `SyncSummary { sets: {...}, cards: { seen, added, updated, unchanged, tombstoned } }`
  for logging.

### Better-than-RFC note

Where the RFC skeleton uses `as any` casts during refresh (RFC §13.5), the real implementation
reconstructs VOs via dedicated `toRefreshParams(source)` helpers. The helper in
`docs/prompts/riftnation-catalog-refresh-helper.ts` is the starting point — the production version
extends it to cover every VO and the addendum's new fields.

## CLI entry point

`src/scripts/sync-catalog.cli.ts` — a Nest standalone application:

```ts
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });
  try {
    const sync = app.get(CatalogSyncService);
    const client = app.get<OfficialCatalogClient>(OFFICIAL_CATALOG_CLIENT);
    const snapshot = await client.fetchCatalog();
    const summary = await sync.syncBatch(snapshot);
    console.log(JSON.stringify({ ok: true, ...summary, fetchedVia: snapshot.meta.fetchedVia }));
    process.exit(0);
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err) }));
    process.exit(1);
  } finally {
    await app.close();
  }
}
main();
```

`package.json`: `"sync:catalog": "ts-node --transpile-only src/scripts/sync-catalog.cli.ts"`.

## Scheduler

`.github/workflows/sync-catalog.yml`:

```yaml
on:
  schedule:
    - cron: '0 7 * * *'      # 07:00 UTC = 11:00 Asia/Dubai (GST, no DST)
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run migrate
      - run: npm run sync:catalog
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          RIFTBOUND_GALLERY_URL: https://riftbound.leagueoflegends.com/en-us/card-gallery/
```

- `DATABASE_URL` stored as a repo secret, pointed at Neon.
- `workflow_dispatch` gives a manual re-run button.
- Migrations run before sync — cheap no-op after the first run.
- Known caveat: GitHub scheduled runs can drift up to ~15 minutes. Acceptable for daily cadence.
- If `CompositeSourceClient` triggers fallback, it will install Chromium in-process via Playwright.
  A separate workflow step *can* pre-install it, but only when a workflow input asks for it, to
  keep the normal run cheap.

## Schema

See the addendum for the full column list. Migrations live under
`src/catalog/infrastructure/persistence/migrations/` and are generated with `typeorm migration:generate`.

### Indexes (final, MVP)

Per RFC §14.3 plus additions for fields the addendum introduces:

- `cards(set_id, collector_number)`
- `cards(rarity)`
- `cards(card_type_primary)` — the first entry of `card_types` promoted for quick filter
  (see addendum §2.4 if we choose to promote; otherwise drop this)
- GIN on `cards(card_types)`
- GIN on `cards(domains)`
- GIN on `cards(tags)`
- GIN on `cards(raw)`
- Trigram/FTS on `cards(name)` — deferred; stub migration file committed but disabled until the
  marketplace actually needs it.

## Error handling

- Zod validation (or class-validator) on the mapped source records before any aggregate is
  constructed — any shape drift fails loudly before we open the DB transaction.
- VO invariants enforce the domain rules (RFC §5 + addendum). Violations throw during
  `CardAggregate.create` / `.refreshFromSource`, again before persistence.
- Transaction rollback on any failure; idempotent re-runs.
- CLI exits non-zero → GitHub emails the repo owner. No silent success.

## Testing

- **Domain unit tests**: aggregate + VO invariants (`card.aggregate.spec.ts`, one per VO).
  Cover the addendum fields.
- **Mapper tests**: `riot-source.mapper.spec.ts` uses a committed fixture
  `test/fixtures/riot-cards-snapshot.json` — ~25 varied cards chosen to cover multi-domain,
  superType, mightBonus, effect, landscape orientation, the duplicate Teemo row, and at least one
  card per set. Asserts the RFC-shape output byte-for-byte.
- **Integration test**: `catalog-sync.integration.spec.ts` boots `postgres:16-alpine` via
  `@testcontainers/postgresql`, runs migrations, stubs `OFFICIAL_CATALOG_CLIENT` with a
  fixture-backed fake, runs `CatalogSyncService.syncBatch` twice, and asserts:
  row counts, spot-check card values, idempotency (`updated=0` on second run), tombstone
  behavior when a card is dropped from the snapshot, re-appearance clears the tombstone.
- We never hit the live Riot site from CI.

## Risks

- **`__NEXT_DATA__` shape is not a public contract.** Mitigation: zod validation; failures are
  loud. We're one layer removed from Riot because we already route through our own source record.
- **5-card embedded-vs-total gap** could grow if Riot moves more content to client-side hydration.
  Mitigation: the Composite client's threshold + logging; fallback activates automatically.
- **Sanity CDN URLs** include `?accountingTag=RB` on some card-image references but not all.
  Stored verbatim. If this param ever becomes auth-load-bearing we normalize centrally.

## Next step

Invoke the writing-plans skill to produce a step-by-step implementation plan from this design
plus the addendum.
