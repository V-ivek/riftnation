# Catalog Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the write path of the NestJS **Catalog** bounded context — a daily sync that pulls the official Riftbound card catalog from the public gallery page into Postgres at 11:00 Asia/Dubai.

**Architecture:** NestJS modular monolith. One bounded context for now (`catalog/`) with the layers the RFC prescribes (domain → application → infrastructure → api). Daily runs happen via a Nest standalone CLI invoked by a GitHub Actions cron; the service layer is the same code the future HTTP admin controller will reuse.

**Tech Stack:** Node.js 20, TypeScript 5, NestJS 10, TypeORM 0.3 (Postgres driver), Postgres 16 (Neon in prod), cheerio, zod, Playwright (fallback only), vitest + `@testcontainers/postgresql` for tests.

**Design docs:**
- `docs/plans/2026-04-18-catalog-sync-design.md` (this plan's source of truth for architecture/flow).
- `docs/plans/2026-04-18-catalog-rfc-addendum-observed-fields.md` (extends the `Card` aggregate with 8 observed fields).
- `docs/prompts/riftnation-catalog-ddd-rfc-nestjs.md` (original RFC v0.1; base skeleton).

**TDD discipline:** every production file lands on a failing test that the step afterwards turns green. No exceptions. Commits happen per task, not per phase.

**YAGNI:** this plan deliberately does not ship the `CatalogQueryService`, HTTP admin controllers, domain-event subscribers, or full-text search. Those are future work for marketplace contexts.

---

## Phase 0 — Repository bootstrap

### Task 0.1: Initialize the NestJS project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `nest-cli.json`
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `src/main.ts`
- Create: `src/app.module.ts`

**Step 1: Write a smoke test that the Nest app bootstraps**

Create `test/bootstrap.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('AppModule', () => {
  it('bootstraps', async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(mod).toBeDefined();
    await mod.close();
  });
});
```

**Step 2: Install dependencies and write minimal Nest files**

`package.json`:

```json
{
  "name": "riftnation",
  "version": "0.0.1",
  "private": true,
  "engines": { "node": ">=20.0.0 <21.0.0" },
  "scripts": {
    "build": "nest build",
    "start:dev": "nest start --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "migrate": "typeorm-ts-node-commonjs migration:run -d src/data-source.ts",
    "sync:catalog": "ts-node --transpile-only src/scripts/sync-catalog.cli.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/typeorm": "^10.0.2",
    "cheerio": "^1.0.0-rc.12",
    "pg": "^8.11.3",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1",
    "typeorm": "^0.3.20",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/testing": "^10.3.0",
    "@testcontainers/postgresql": "^10.7.0",
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "playwright": "^1.41.0",
    "testcontainers": "^10.7.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "moduleResolution": "node",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "paths": { "@/*": ["src/*"] },
    "skipLibCheck": true
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*.spec.ts"]
}
```

`nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

`.gitignore`:

```
node_modules/
dist/
.env
.env.*
!.env.example
coverage/
.playwright/
*.log
```

`.nvmrc`:

```
20
```

`src/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

`src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';

@Module({ imports: [] })
export class AppModule {}
```

**Step 3: Install deps and run the test**

Run:
```
npm install
npx vitest run test/bootstrap.spec.ts
```

Expected: one test passes.

**Step 4: Commit**

```
git add -A
git commit -m "chore: scaffold NestJS project"
```

---

### Task 0.2: Configure vitest + testcontainers

**Files:**
- Create: `vitest.config.ts`
- Create: `test/setup.ts`

**Step 1: Add a failing integration-style test that uses testcontainers**

Create `test/testcontainers-smoke.spec.ts`:

```ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

describe('testcontainers', () => {
  it('boots postgres and runs SELECT 1', async () => {
    const container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    const res = await client.query('SELECT 1 AS one');
    expect(res.rows[0].one).toBe(1);
    await client.end();
    await container.stop();
  }, 60_000);
});
```

**Step 2: Add vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
```

**Step 3: Run the test**

Run:
```
npx vitest run test/testcontainers-smoke.spec.ts
```

Expected: PASS after Docker pulls the image. If Docker is not running locally, the test fails with a Docker socket error — that is expected; the subagent should start Docker Desktop and retry.

**Step 4: Commit**

```
git add vitest.config.ts test/testcontainers-smoke.spec.ts
git commit -m "chore: add vitest + testcontainers smoke test"
```

---

## Phase 1 — Domain value objects

We implement each VO with full TDD for the first one, then apply the same pattern to the rest. The VO list merges RFC §7.2 with the addendum §5.

### Task 1.1: `SetId` VO (reference implementation)

**Files:**
- Create: `src/catalog/domain/value-objects/set-id.vo.ts`
- Create: `src/catalog/domain/value-objects/set-id.vo.spec.ts`

**Step 1: Write failing tests**

`src/catalog/domain/value-objects/set-id.vo.spec.ts`:

```ts
import { SetId } from './set-id.vo';

describe('SetId', () => {
  it('uppercases and trims', () => {
    expect(SetId.create('  unl ').toString()).toBe('UNL');
  });

  it('rejects empty and whitespace', () => {
    expect(() => SetId.create('')).toThrow(/SetId/);
    expect(() => SetId.create('   ')).toThrow(/SetId/);
  });

  it('equals is value-based', () => {
    expect(SetId.create('OGN').equals(SetId.create('ogn'))).toBe(true);
    expect(SetId.create('OGN').equals(SetId.create('UNL'))).toBe(false);
  });
});
```

**Step 2: Verify the tests fail**

Run: `npx vitest run src/catalog/domain/value-objects/set-id.vo.spec.ts`
Expected: FAIL — cannot resolve `./set-id.vo`.

**Step 3: Implement the VO**

`src/catalog/domain/value-objects/set-id.vo.ts`:

```ts
export class SetId {
  private constructor(private readonly value: string) {}

  static create(value: string): SetId {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) throw new Error('SetId cannot be empty');
    return new SetId(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SetId): boolean {
    return this.value === other.value;
  }
}
```

**Step 4: Verify the tests pass**

Run the same command. Expected: PASS.

**Step 5: Commit**

```
git add src/catalog/domain/value-objects/set-id.vo.ts src/catalog/domain/value-objects/set-id.vo.spec.ts
git commit -m "feat(catalog): add SetId value object"
```

---

### Task 1.2: Remaining primitive-string VOs (`CardId`, `SetName`, `CardName`, `PublicCode`, `CardSuperType`, `EffectTextHtml`, `RulesTextHtml`, `IllustratorName`, `Tag`)

For each VO in this task, follow the same five-step pattern as Task 1.1. Tests first, then implementation, then commit. Create one VO per file pair (`<name>.vo.ts` + `<name>.vo.spec.ts`). Make one commit per VO so reviewers can read them one at a time:

```
git commit -m "feat(catalog): add CardId value object"
```

**Shared rules for all of these VOs:**
- Private constructor; static `create(value: string)`.
- `create` trims; rejects empty/whitespace with `new Error('<Name> cannot be empty')`.
- `toString()` returns the stored string.
- `equals(other)` compares by value.
- Test cases per VO: (a) trims, (b) rejects empty/whitespace, (c) equals is value-based.

**Case rules per VO (override the base pattern):**

| VO | Normalization |
|---|---|
| `CardId` | trim only (preserves case — IDs are already lowercase in source) |
| `SetName` | trim only |
| `CardName` | trim only |
| `PublicCode` | trim; uppercase slash-preserving (e.g. `UNL-131/219`) |
| `CardSuperType` | trim + lowercase |
| `EffectTextHtml` | trim only |
| `RulesTextHtml` | trim only |
| `IllustratorName` | trim only |
| `Tag` | trim only |

File paths:

- `src/catalog/domain/value-objects/card-id.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/set-name.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/card-name.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/public-code.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/card-super-type.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/effect-text-html.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/rules-text-html.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/illustrator-name.vo.ts` (+ spec)
- `src/catalog/domain/value-objects/tag.vo.ts` (+ spec)

---

### Task 1.3: Enumerated-string VOs (`Rarity`, `CardType`, `Domain`, `Orientation`)

These VOs take a closed set of allowed values. Tests assert each allowed value passes and at least one invalid value throws.

**Allowed values:**

| VO | Allowed ids |
|---|---|
| `Rarity` | `common`, `uncommon`, `rare`, `epic`, `showcase` |
| `CardType` | `spell`, `battlefield`, `unit`, `gear`, `legend`, `rune` |
| `Domain` | `body`, `calm`, `chaos`, `colorless`, `fury`, `mind`, `order` |
| `Orientation` | `portrait`, `landscape` |

**Pattern (example for `Rarity`):**

`src/catalog/domain/value-objects/rarity.vo.spec.ts`:

```ts
import { Rarity } from './rarity.vo';

describe('Rarity', () => {
  it('accepts all known ids, case- and space-insensitive', () => {
    for (const id of ['common', 'uncommon', 'rare', 'epic', 'showcase']) {
      expect(Rarity.create(` ${id.toUpperCase()} `).toString()).toBe(id);
    }
  });

  it('rejects unknown ids', () => {
    expect(() => Rarity.create('legendary')).toThrow(/Rarity/);
  });

  it('rejects empty', () => {
    expect(() => Rarity.create('')).toThrow(/Rarity/);
  });
});
```

Implementation:

```ts
const ALLOWED = ['common', 'uncommon', 'rare', 'epic', 'showcase'] as const;
type RarityId = typeof ALLOWED[number];

export class Rarity {
  private constructor(private readonly value: RarityId) {}

  static create(value: string): Rarity {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) throw new Error('Rarity cannot be empty');
    if (!ALLOWED.includes(normalized as RarityId)) {
      throw new Error(`Rarity must be one of ${ALLOWED.join(', ')}; got "${normalized}"`);
    }
    return new Rarity(normalized as RarityId);
  }

  toString(): RarityId { return this.value; }
  equals(other: Rarity): boolean { return this.value === other.value; }
}
```

Commit each VO individually, same as Task 1.2.

---

### Task 1.4: Numeric VOs (`CollectorNumber`, `EnergyCost`, `Might`, `Power`, `MightBonus`)

**Pattern (example for `CollectorNumber`):**

Spec file asserts:
1. accepts 1 (positive integer).
2. rejects 0 (must be `>= 1`).
3. rejects -1.
4. rejects 1.5.

Implementation follows the RFC's `CollectorNumber` shape but each numeric VO has different bounds:

| VO | Min | Integer? | Nullable-friendly |
|---|---|---|---|
| `CollectorNumber` | 1 | yes | no (always present) |
| `EnergyCost` | 0 | yes | yes (nullable on aggregate) |
| `Might` | 0 | yes | yes |
| `Power` | 0 | yes | yes |
| `MightBonus` | 0 | yes | yes |

Each VO has a `toNumber(): number` and an `equals(other)`.

Separate file pair per VO; one commit per VO.

---

### Task 1.5: `CardImage` VO

**Files:**
- Create: `src/catalog/domain/value-objects/card-image.vo.ts` + spec

**State:** `url: string`, `alt: string | null`.

**Invariants:**
- `url` must not be blank.
- `url` must start with `https://` (quick sanity check — not a full URL validator).
- `alt` stays nullable; trims when present; null/whitespace collapses to null.

**Tests:** valid url + alt; valid url + null alt; rejects blank url; rejects `http://`; rejects non-string url.

**API:** `static create(params: { url: string; alt?: string | null }): CardImage`, `get url(): string`, `get alt(): string | null`, `equals(other: CardImage): boolean`.

---

## Phase 2 — Domain aggregates

### Task 2.1: `SetAggregate`

**Files:**
- Create: `src/catalog/domain/aggregates/set.aggregate.ts` + spec
- Use: the RFC §13.2 skeleton as starting point.

**Tests (spec order):**
1. `create` with valid params produces an aggregate whose getters return the normalized values.
2. `create` throws if `name` is blank.
3. `refreshFromSource` mutates state when called with new values.
4. `refreshFromSource` throws if new name is blank.

**Implementation:** copy RFC §13.2's `SetAggregate` verbatim. No addendum changes for `Set`.

Commit: `feat(catalog): add SetAggregate`.

---

### Task 2.2: `CardAggregate` — baseline RFC fields

**Files:**
- Create: `src/catalog/domain/aggregates/card.aggregate.ts` + spec

**Tests (spec order):**
1. `create` stores all RFC-v0.1 fields; getters return them.
2. `create` validates numerics via VOs (`EnergyCost`, `Might`).
3. `create` normalizes `cardTypes`, `domains`, `illustrators` — trims, lowercases, unique-ifies.
4. `hasType`, `hasDomain`, `belongsToSet` behave correctly.
5. `refreshFromSource` replaces state.

**Implementation:** copy RFC §13.2 `CardAggregate` verbatim. Keep the `as any` casts only in tests temporarily; production code must avoid them (Task 3.2 addresses).

Commit: `feat(catalog): add CardAggregate baseline`.

---

### Task 2.3: `CardAggregate` — addendum extensions

**Files:**
- Modify: `src/catalog/domain/aggregates/card.aggregate.ts`
- Modify: `src/catalog/domain/aggregates/card.aggregate.spec.ts`

**Step 1: Add failing tests for the new fields**

Extend the existing spec:

```ts
it('stores publicCode, cardSuperType, power, mightBonus, orientation, effectTextHtml, tags', () => {
  const card = CardAggregate.create({
    ...baselineParams(),
    publicCode: PublicCode.create('UNL-131/219'),
    cardSuperType: CardSuperType.create('champion'),
    power: Power.create(2),
    mightBonus: MightBonus.create(3),
    orientation: Orientation.create('portrait'),
    effectTextHtml: EffectTextHtml.create('<p>effect</p>'),
    tags: ['Mech', 'Piltover'].map(Tag.create),
  });
  expect(card.publicCode).toBe('UNL-131/219');
  expect(card.cardSuperType).toBe('champion');
  expect(card.power).toBe(2);
  expect(card.mightBonus).toBe(3);
  expect(card.orientation).toBe('portrait');
  expect(card.effectTextHtml).toBe('<p>effect</p>');
  expect(card.tags).toEqual(['mech', 'piltover']); // lowercased+unique via normalizer
});

it('rejects future deletedAt', () => {
  const future = new Date(Date.now() + 60_000);
  expect(() =>
    CardAggregate.create({ ...baselineParams(), deletedAt: future })
  ).toThrow(/deletedAt/);
});

it('tags empty default', () => {
  const card = CardAggregate.create({ ...baselineParams(), tags: [] });
  expect(card.tags).toEqual([]);
});

it('refreshFromSource updates addendum fields', () => {
  const card = CardAggregate.create(baselineParams());
  card.refreshFromSource({ ...baselineRefreshParams(), power: Power.create(5) });
  expect(card.power).toBe(5);
});

it('markDeleted sets tombstone; restore clears it', () => {
  const card = CardAggregate.create(baselineParams());
  card.markDeleted(new Date('2026-04-18T00:00:00Z'));
  expect(card.deletedAt).toEqual(new Date('2026-04-18T00:00:00Z'));
  card.restore();
  expect(card.deletedAt).toBeNull();
});
```

**Step 2: Extend `CardAggregate` implementation**

- Add new private fields with matching getters: `_publicCode`, `_cardSuperType`, `_power`, `_mightBonus`, `_orientation`, `_effectTextHtml`, `_tags`, `_deletedAt`.
- Extend `create` and `refreshFromSource` params.
- Add `markDeleted(at: Date)` — throws if `at` is in the future.
- Add `restore()` — sets `_deletedAt = null`.
- Extend `normalizeUniqueStrings` usage for `tags`.
- Invariant: `deletedAt`, if set, must not be in the future.

**Step 3: Run tests**

Run: `npx vitest run src/catalog/domain/aggregates/card.aggregate.spec.ts`
Expected: PASS.

**Step 4: Commit**

```
git add -A
git commit -m "feat(catalog): extend CardAggregate with addendum fields"
```

---

### Task 2.4: Domain events

**Files:**
- Create: `src/catalog/domain/events/set-synced.event.ts` + spec
- Create: `src/catalog/domain/events/card-synced.event.ts` + spec
- Create: `src/catalog/domain/events/card-metadata-changed.event.ts` + spec

**Pattern:** each event is a plain class with `constructor(readonly payload: {...})` and a static `TYPE` string.

Example `CardMetadataChanged`:

```ts
export class CardMetadataChanged {
  static readonly TYPE = 'catalog.card.metadata_changed';
  constructor(readonly payload: {
    cardId: string;
    setId: string;
    changedFields: string[];
    at: Date;
  }) {}
}
```

Spec: asserts the static type string and that the payload is stored verbatim.

We do not yet wire a publisher — events are emitted from the service layer later in Task 5.2.

Commit per event file.

---

## Phase 3 — Application factories and refresh helper

### Task 3.1: `SetFactory` and `CardFactory`

**Files:**
- Create: `src/catalog/application/factories/set.factory.ts` + spec
- Create: `src/catalog/application/factories/card.factory.ts` + spec

**Tests:** build an aggregate from a snake-case source record; assert each field lands correctly via VOs.

**Source record shapes:**

```ts
export interface SetSourceRecord {
  id: string;
  name: string;
  collector_number_max: number;
  raw: Record<string, unknown>;
}

export interface CardSourceRecord {
  id: string;
  set_id: string;
  collector_number: number;
  public_code: string;
  name: string;
  rarity: string;
  card_types: string[];
  card_super_type: string | null;
  domains: string[];
  energy_cost: number | null;
  might: number | null;
  power: number | null;
  might_bonus: number | null;
  orientation: string;
  rules_text_html: string;
  effect_text_html: string | null;
  image_url: string;
  image_alt: string | null;
  illustrators: string[];
  tags: string[];
  raw: Record<string, unknown>;
}
```

These two interfaces live next to the factories (e.g. `src/catalog/application/ports/source-records.ts`).

**Implementation:** each factory's `fromSource(src, now = new Date())` method builds the correct VOs and calls the aggregate's `create`. Use real VOs — do not pass primitives via `as any` (this is the "better than RFC" fix from the design doc §3).

Commit per factory.

---

### Task 3.2: Typed refresh mapper helper

**Files:**
- Create: `src/catalog/application/factories/card-refresh-params.ts`
- Create: `src/catalog/application/factories/card-refresh-params.spec.ts`
- Supersedes: `docs/prompts/riftnation-catalog-refresh-helper.ts` (leave the prompts file alone — it stays as a design note).

**Step 1: Failing test**

```ts
import { toCardRefreshParams } from './card-refresh-params';

describe('toCardRefreshParams', () => {
  it('reconstructs VOs and preserves optional nulls', () => {
    const params = toCardRefreshParams({
      collector_number: 131,
      name: 'Abandon',
      public_code: 'UNL-131/219',
      rarity: 'uncommon',
      card_types: ['spell'],
      card_super_type: null,
      domains: ['chaos'],
      energy_cost: 2,
      might: null,
      power: null,
      might_bonus: null,
      orientation: 'portrait',
      rules_text_html: '<p>body</p>',
      effect_text_html: null,
      image_url: 'https://example.com/x.png',
      image_alt: null,
      illustrators: ['Kudos Productions'],
      tags: [],
      raw: {},
    });
    expect(params.collectorNumber.toNumber()).toBe(131);
    expect(params.publicCode.toString()).toBe('UNL-131/219');
    expect(params.cardSuperType).toBeNull();
    expect(params.tags).toEqual([]);
  });
});
```

**Step 2: Implement**

Use the `CardSourceRecord` interface. For each field, either build a VO or pass `null` if the source value is null and the aggregate allows it. `tags` becomes `Tag[]`.

**Step 3: Commit**

```
git add src/catalog/application/factories/card-refresh-params.ts src/catalog/application/factories/card-refresh-params.spec.ts
git commit -m "feat(catalog): add typed CardAggregate refresh params helper"
```

---

## Phase 4 — Infrastructure: persistence

### Task 4.1: `DATABASE_URL` config and `data-source.ts`

**Files:**
- Create: `.env.example`
- Create: `src/config/database.config.ts`
- Create: `src/data-source.ts`

**Files content:**

`.env.example`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/riftnation
RIFTBOUND_GALLERY_URL=https://riftbound.leagueoflegends.com/en-us/card-gallery/
```

`src/config/database.config.ts`:

```ts
import { DataSourceOptions } from 'typeorm';
import { SetOrmEntity } from '../catalog/infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from '../catalog/infrastructure/persistence/entities/card.orm-entity';

export function databaseOptionsFromEnv(): DataSourceOptions {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return {
    type: 'postgres',
    url,
    entities: [SetOrmEntity, CardOrmEntity],
    migrations: ['src/catalog/infrastructure/persistence/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
  };
}
```

`src/data-source.ts`:

```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptionsFromEnv } from './config/database.config';

export const AppDataSource = new DataSource(databaseOptionsFromEnv());
```

**Step 1: Smoke test — the data source factory throws without the env var**

Create `src/config/database.config.spec.ts`:

```ts
import { databaseOptionsFromEnv } from './database.config';

describe('databaseOptionsFromEnv', () => {
  it('throws without DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(() => databaseOptionsFromEnv()).toThrow(/DATABASE_URL/);
  });

  it('returns postgres options when set', () => {
    process.env.DATABASE_URL = 'postgres://u:p@h:5432/db';
    expect(databaseOptionsFromEnv().type).toBe('postgres');
  });
});
```

Expected: FAIL until the entities exist (import errors). That's fine — move on and come back in Task 4.4 to confirm it passes.

Commit: `chore(infra): add DATABASE_URL config + data source`.

---

### Task 4.2: ORM entities

**Files:**
- Create: `src/catalog/infrastructure/persistence/entities/set.orm-entity.ts`
- Create: `src/catalog/infrastructure/persistence/entities/card.orm-entity.ts`

**`SetOrmEntity`**: copy RFC §13.7 verbatim.

**`CardOrmEntity`**: copy RFC §13.7 and add the addendum columns. Example:

```ts
@Column({ name: 'public_code', type: 'text' })
publicCode!: string;

@Column({ name: 'card_super_type', type: 'text', nullable: true })
cardSuperType!: string | null;

@Column({ type: 'int', nullable: true })
power!: number | null;

@Column({ name: 'might_bonus', type: 'int', nullable: true })
mightBonus!: number | null;

@Column({ type: 'text' })
orientation!: string;

@Column({ name: 'effect_text_html', type: 'text', nullable: true })
effectTextHtml!: string | null;

@Column({ type: 'text', array: true, default: '{}' })
tags!: string[];

@Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
deletedAt!: Date | null;
```

Also change `cardTypes`, `domains`, `illustrators` to `nullable: false, default: '{}'` to match addendum rules.

No tests for this file — pure mapping — but the next task (migration) validates it end-to-end.

Commit: `feat(catalog): add ORM entities`.

---

### Task 4.3: Initial TypeORM migration

**Files:**
- Create: `src/catalog/infrastructure/persistence/migrations/1713412800000-init-catalog.ts`

**Step 1: Write an integration test that asserts the migration runs cleanly**

Create `src/catalog/infrastructure/persistence/migrations/migrations.spec.ts`:

```ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { SetOrmEntity } from '../entities/set.orm-entity';
import { CardOrmEntity } from '../entities/card.orm-entity';
import { InitCatalog1713412800000 } from './1713412800000-init-catalog';

describe('InitCatalog migration', () => {
  let container: StartedPostgreSqlContainer;
  let ds: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    ds = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      entities: [SetOrmEntity, CardOrmEntity],
      migrations: [InitCatalog1713412800000],
    });
    await ds.initialize();
  }, 60_000);

  afterAll(async () => {
    await ds.destroy();
    await container.stop();
  });

  it('creates sets and cards with all required columns and indexes', async () => {
    await ds.runMigrations();
    const cols = await ds.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'cards'`
    );
    const names: string[] = cols.map((c: any) => c.column_name);
    for (const c of [
      'id','set_id','collector_number','public_code','name','rarity',
      'card_types','card_super_type','domains','energy_cost','might',
      'power','might_bonus','orientation','rules_text_html','effect_text_html',
      'image_url','image_alt','illustrators','tags','raw','deleted_at','synced_at',
    ]) {
      expect(names).toContain(c);
    }
  });

  it('re-running migrations is idempotent', async () => {
    await ds.runMigrations();
    await ds.runMigrations();
  });
});
```

**Step 2: Verify FAIL** — migration file does not exist.

**Step 3: Implement migration**

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCatalog1713412800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS sets (
        id                    text PRIMARY KEY,
        name                  text NOT NULL,
        collector_number_max  int  NOT NULL,
        raw                   jsonb NOT NULL,
        synced_at             timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id                text PRIMARY KEY,
        set_id            text NOT NULL REFERENCES sets(id),
        collector_number  int  NOT NULL,
        public_code       text NOT NULL,
        name              text NOT NULL,
        rarity            text NOT NULL,
        card_types        text[] NOT NULL DEFAULT '{}',
        card_super_type   text,
        domains           text[] NOT NULL DEFAULT '{}',
        energy_cost       int,
        might             int,
        power             int,
        might_bonus       int,
        orientation       text NOT NULL CHECK (orientation IN ('portrait','landscape')),
        rules_text_html   text NOT NULL,
        effect_text_html  text,
        image_url         text NOT NULL,
        image_alt         text,
        illustrators      text[] NOT NULL DEFAULT '{}',
        tags              text[] NOT NULL DEFAULT '{}',
        raw               jsonb NOT NULL,
        deleted_at        timestamptz,
        synced_at         timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_set_coll ON cards(set_id, collector_number);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_card_types ON cards USING GIN (card_types);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_domains ON cards USING GIN (domains);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_tags ON cards USING GIN (tags);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_raw ON cards USING GIN (raw);`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS cards;`);
    await q.query(`DROP TABLE IF EXISTS sets;`);
  }
}
```

**Step 4: Run the migration test** — Expected PASS.

**Step 5: Commit**

```
git add -A
git commit -m "feat(catalog): initial migration with RFC + addendum schema"
```

---

### Task 4.4: Card & Set mappers (ORM ↔ domain)

**Files:**
- Create: `src/catalog/infrastructure/persistence/mappers/set.mapper.ts` + spec
- Create: `src/catalog/infrastructure/persistence/mappers/card.mapper.ts` + spec

**Tests:** round-trip — domain → ORM → domain. Asserts every field survives the trip. The card mapper test includes an addendum field sweep.

**Implementation:** static `toDomain(entity)` and `toPersistence(agg)` methods mirroring RFC §13.8 extended for the addendum fields. Use the typed refresh helper from Task 3.2 in `toDomain`.

Commit per mapper file.

---

### Task 4.5: Repository implementations

**Files:**
- Create: `src/catalog/domain/repositories/set.repository.ts` (port)
- Create: `src/catalog/domain/repositories/card.repository.ts` (port)
- Create: `src/catalog/infrastructure/persistence/repositories/set.repository.impl.ts` + spec
- Create: `src/catalog/infrastructure/persistence/repositories/card.repository.impl.ts` + spec

**Ports:** copy RFC §10 + §13.3. The `CardRepository` port gains two addendum-driven methods:

```ts
findIdsBySet(setId: SetId): Promise<CardId[]>;        // used to compute tombstones
```

**Spec (example, `card.repository.impl.spec.ts`):** spin up testcontainers Postgres, run the migration, construct the DataSource, save a card, load by id, assert round-trip, assert `findIdsBySet` returns what was saved. One spec file per repository.

Commit per repository.

---

## Phase 5 — Application: sync service

### Task 5.1: `SyncSummary` type + stub `CatalogSyncService`

**Files:**
- Create: `src/catalog/application/services/sync-summary.ts`
- Create: `src/catalog/application/services/catalog-sync.service.ts` + spec (stub)

`sync-summary.ts`:

```ts
export interface SyncSummary {
  sets:  { seen: number; added: number; updated: number; unchanged: number };
  cards: { seen: number; added: number; updated: number; unchanged: number; tombstoned: number; restored: number };
  fetchedVia: 'next-data' | 'playwright';
  embeddedCount: number;
  totalItems: number;
  durationMs: number;
}
```

Stub service: a class with a single `async syncBatch(snapshot): Promise<SyncSummary>` that throws `new Error('not implemented')`. Spec asserts the throw. This unblocks the CLI task (it'll wire to this service) without making the service's correctness gate CLI work.

Commit: `feat(catalog): add SyncSummary + stub CatalogSyncService`.

---

### Task 5.2: `CatalogSyncService` — real implementation

**Files:**
- Modify: `src/catalog/application/services/catalog-sync.service.ts`
- Modify: `src/catalog/application/services/catalog-sync.service.spec.ts`

**Step 1: Integration spec first (before any implementation changes)**

The spec uses testcontainers, real repositories, and a fake `OfficialCatalogClient`.

```ts
describe('CatalogSyncService.syncBatch', () => {
  // helpers omitted — set up DataSource, run migration, build service with real repos.

  it('inserts sets and cards on first run', async () => { /* ... */ });

  it('is idempotent on unchanged input', async () => { /* run twice, assert added=0 updated=0 on second */ });

  it('updates changed fields and emits CardMetadataChanged', async () => { /* change might, re-run */ });

  it('tombstones cards that disappear from the snapshot', async () => { /* remove one from snapshot, re-run, assert deleted_at set */ });

  it('restores a previously tombstoned card that re-appears', async () => { /* re-run with it back */ });

  it('rolls back on a mid-run VO violation', async () => { /* feed a blank name in the 3rd card */ });
});
```

**Step 2: Run — verify failures.**

**Step 3: Implement.**

Key behaviors (all transactional inside a single TypeORM `DataSource.transaction`):

1. Pre-flight zod validation of the snapshot's `sets` and `cards` arrays. Fail loudly before opening the transaction if shapes drift.
2. Upsert sets: for each `SetSourceRecord`, `findById`; if missing, `factory.fromSource` → `save`; if present, `refreshFromSource` then `save`. Track counts.
3. Upsert cards:
   - For each `CardSourceRecord`, `findById`; missing → factory + save; present → compute normalized-field delta (name, rarity, card_types, etc.). If any differs, `refreshFromSource` + `save`; emit `CardMetadataChanged` with the list of changed field names. If nothing differs, skip save.
   - After the card loop, `findIdsBySet` for each set in the snapshot; diff against the set of snapshot card ids to find tombstone candidates. For each missing id, call `markDeleted` + save.
   - For each previously-tombstoned card present in this snapshot, call `restore` + save.
4. Event collection: the service aggregates domain events raised during the batch and, for MVP, just passes them to a Nest logger. No real event bus yet — the design explicitly defers publication. Keep the shape (emit-to-logger) simple; a future task wires a real bus.
5. Return the `SyncSummary`.

**Step 4: Run tests.** Expected PASS.

**Step 5: Commit**

```
git add -A
git commit -m "feat(catalog): implement CatalogSyncService"
```

---

## Phase 6 — Infrastructure: source client

### Task 6.1: Port and types

**Files:**
- Create: `src/catalog/infrastructure/source/official-catalog-client.ts`

Copy the port interface from the design doc §"Source client → Port". Also export the two source-record types (re-export from Task 3.1's `ports/source-records.ts`). No spec — it's a pure interface file.

Commit: `feat(catalog): add OfficialCatalogClient port`.

---

### Task 6.2: `RiotSourceMapper`

**Files:**
- Create: `src/catalog/infrastructure/source/riot-source.mapper.ts` + spec
- Create: `test/fixtures/riot-card-samples.json` (25 hand-picked sample cards from the live payload)

**Step 1: Generate the fixture**

Run:

```
curl -sL -A "Mozilla/5.0" https://riftbound.leagueoflegends.com/en-us/card-gallery/ \
  -o /tmp/gallery.html
node -e "
const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('/tmp/gallery.html','utf8');
const $ = cheerio.load(html);
const data = JSON.parse($('#__NEXT_DATA__').text());
const gallery = data.props.pageProps.page.blades.find(b => b.type === 'riftboundCardGallery');
const cards = gallery.cards.items;
const pick = ids => cards.filter(c => ids.includes(c.id));
const sample = pick([
  'unl-131-219','unl-019-219','unl-192-219','sfd-161-221','sfd-200-221',
  'ogn-121a-298','ogs-005-024','sfd-001-221','ogn-179-298','ogn-056-298',
  // plus another ~15 covering all rarities, card types, supertypes, orientations
]);
fs.writeFileSync('test/fixtures/riot-card-samples.json', JSON.stringify({cards: sample, sets: gallery.sets.items}, null, 2));
console.log('wrote', sample.length, 'cards');
"
```

Commit the fixture JSON separately from code so reviewers can see it landing.

**Step 2: Spec**

Test file asserts `RiotSourceMapper.toSourceRecord(fixtureCard)` produces exact snake-case outputs for each of ~25 cards. Use `toMatchInlineSnapshot` sparingly — prefer explicit assertions for the trickier cases (multi-domain, superType present, null `energy_cost`, landscape orientation, non-empty tags).

**Step 3: Implement**

Straightforward deep-access mapping per design doc §"Riot source mapping". Handle missing fields → null. `raw` is the unmodified input object. De-duplicate by `id` for the set-level `mapSnapshot` helper (handles the Teemo duplicate).

**Step 4: Run — PASS. Commit.**

```
git add src/catalog/infrastructure/source/riot-source.mapper.ts src/catalog/infrastructure/source/riot-source.mapper.spec.ts
git commit -m "feat(catalog): map Riot JSON to snake-case source records"
```

---

### Task 6.3: `NextDataSourceClient`

**Files:**
- Create: `src/catalog/infrastructure/source/next-data.source-client.ts` + spec

**Spec:** spin up a local HTTP server (`http.createServer`) that serves `test/fixtures/gallery.min.html` — a minimal page that embeds a `<script id="__NEXT_DATA__">` block containing the fixture from Task 6.2. Assert the client returns the expected set/card counts and `meta.fetchedVia === 'next-data'`.

**Implementation:** use `fetch` (native on Node 20) with a realistic `User-Agent`, three-attempt retry with 1s/5s/25s backoff on 5xx and network errors, `cheerio.load(html)`, parse `#__NEXT_DATA__`. Push raw card/set items through `RiotSourceMapper`.

Commit: `feat(catalog): NextDataSourceClient (primary)`.

---

### Task 6.4: `PlaywrightSourceClient`

**Files:**
- Create: `src/catalog/infrastructure/source/playwright.source-client.ts` + spec

**Spec:** skipped when `CI_SKIP_PLAYWRIGHT=1` is set; otherwise launches Chromium headless against the same local HTTP server fixture and asserts the same shape as the Next-data adapter.

**Implementation:** lazy-import Playwright (`import('playwright')` inside the method) so unit tests that don't need it don't pay the hit. Navigate, wait for `window.__NEXT_DATA__`, extract, map.

Commit: `feat(catalog): PlaywrightSourceClient (fallback)`.

---

### Task 6.5: `CompositeSourceClient`

**Files:**
- Create: `src/catalog/infrastructure/source/composite.source-client.ts` + spec

**Spec:**
- Primary returns full data → fallback is never called.
- Primary returns `embeddedCount < totalItems - threshold` → fallback is called; merged snapshot reports `fetchedVia: 'playwright'`; cards absent from primary but present in fallback are in the merged output.
- Primary throws → fallback is called.
- Threshold is configurable via constructor (default 20).

**Implementation:** thin orchestrator. Merges by `id` with fallback winning.

Commit: `feat(catalog): CompositeSourceClient orchestration`.

---

## Phase 7 — Module wiring and CLI

### Task 7.1: `CatalogModule`

**Files:**
- Create: `src/catalog/catalog.module.ts`
- Modify: `src/app.module.ts`

**Step 1: Add a wiring test**

`src/catalog/catalog.module.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { CatalogModule } from './catalog.module';
import { CatalogSyncService } from './application/services/catalog-sync.service';
import { OFFICIAL_CATALOG_CLIENT } from './infrastructure/source/official-catalog-client';

describe('CatalogModule', () => {
  it('resolves sync service and source client', async () => {
    // Provide a test DataSource / stub the TypeORM feature — can use process.env.DATABASE_URL
    // pointing at a testcontainer started in beforeAll for the suite
    const mod = await Test.createTestingModule({ imports: [CatalogModule.forTest(/* options */)] }).compile();
    expect(mod.get(CatalogSyncService)).toBeDefined();
    expect(mod.get(OFFICIAL_CATALOG_CLIENT)).toBeDefined();
    await mod.close();
  });
});
```

Implementation approach: the module exports a `static forRoot()` and a `static forTest()` to parameterize the source client binding — prod binds to `CompositeSourceClient`; tests can swap in a fake. This is cleaner than module-augmentation.

**Step 2: Implement the module**

Follow RFC §13.11. Add providers:
- Factories
- Services (`CatalogSyncService`)
- Mapper utilities
- Source: `CompositeSourceClient` composes `NextDataSourceClient` + `PlaywrightSourceClient` via DI; bind to `OFFICIAL_CATALOG_CLIENT` symbol.

`src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptionsFromEnv } from './config/database.config';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseOptionsFromEnv()),
    CatalogModule.forRoot(),
  ],
})
export class AppModule {}
```

**Step 3: Run tests.** Expected PASS.

**Step 4: Commit**

```
git add -A
git commit -m "feat(catalog): wire CatalogModule"
```

---

### Task 7.2: Sync CLI

**Files:**
- Create: `src/scripts/sync-catalog.cli.ts`
- Create: `src/scripts/sync-catalog.cli.spec.ts`

**Spec:** integration — spin up Postgres via testcontainers, set `DATABASE_URL`, stub `OFFICIAL_CATALOG_CLIENT` with a fixture, run `runSyncCatalog()` (the CLI's exported function), assert it logs a JSON summary line with `ok: true` and the expected counts. Cover the error path by throwing from the fake source.

**Implementation:** per design doc's CLI snippet, factored so `main()` is a thin wrapper around an exported `runSyncCatalog(app: INestApplicationContext)` that the test can call directly with a `Test.createTestingModule(...).compile()` context.

Commit: `feat(catalog): add sync-catalog CLI`.

---

## Phase 8 — GitHub Actions workflow

### Task 8.1: Daily sync workflow

**Files:**
- Create: `.github/workflows/sync-catalog.yml`

No test — workflow YAML is validated by committing it and letting GitHub parse. Follow design doc §"Scheduler" verbatim.

Also add a tiny `npm run migrate:status` script for debugging (`typeorm-ts-node-commonjs migration:show -d src/data-source.ts`) — not strictly required but useful in CI logs. Optional; skip if it slows the task.

Commit: `ci: add daily catalog sync workflow (07:00 UTC)`.

---

### Task 8.2: Secrets setup (runbook entry)

**Files:**
- Create: `docs/runbooks/catalog-sync.md`

One page covering:
- Which GitHub repo secrets are required (`DATABASE_URL`).
- How to run the sync locally (`npm run migrate && npm run sync:catalog` with env vars).
- How to manually trigger the workflow (`gh workflow run sync-catalog.yml`).
- How to read the summary log line.
- What to do when the embedded-vs-total gap alert fires (check `fetchedVia: playwright` appears in logs).

No code; only docs.

Commit: `docs: add catalog-sync runbook`.

---

## Phase 9 — End-to-end smoke

### Task 9.1: Full-stack integration test

**Files:**
- Create: `test/catalog-sync.e2e.spec.ts`

Single test: boots AppModule (with testcontainers Postgres) in test mode, swaps `OFFICIAL_CATALOG_CLIENT` for a fake returning the Task 6.2 fixture, runs `CatalogSyncService.syncBatch` via the CLI's `runSyncCatalog` entry point, asserts the DB ended up with exactly the expected row counts and one spot-check card has every addendum field populated correctly.

Commit: `test(catalog): end-to-end sync smoke`.

---

### Task 9.2: Verify-before-completion

**REQUIRED SUB-SKILL:** Use superpowers:verification-before-completion

Before declaring Phase 9 done:

1. Run the full suite: `npm test`. Expected: all green.
2. Run the production migration against a disposable local Postgres: `docker run --rm -d -p 5433:5432 -e POSTGRES_PASSWORD=x postgres:16-alpine && DATABASE_URL=postgres://postgres:x@localhost:5433/postgres npm run migrate` — expect no errors.
3. Run the sync locally end-to-end: `DATABASE_URL=... npm run sync:catalog`. Expect a JSON summary line on stdout, `ok: true`, `cards.seen > 900`.
4. Manually trigger the workflow once: `gh workflow run sync-catalog.yml`. Confirm the run goes green in the Actions tab.

Only after all four pass may the plan be considered complete.

Commit (only if anything needed fixing during verification): whatever fix was required.

---

## Appendix A — What's explicitly NOT in this plan

- `CatalogQueryService` and the public `GET /catalog/cards` HTTP surface. Added when the marketplace context needs it.
- Admin HTTP controllers for manual sync. The GitHub Actions `workflow_dispatch` button fills this gap for now.
- Domain event publisher / bus. Events are constructed and handed to the Nest logger today; wiring a real bus can wait until a second context consumes them.
- Full-text or trigram search on card names.
- Image mirroring to our own object store. We keep Riot's Sanity CDN URLs.

## Appendix B — Skills to invoke during execution

- **superpowers:test-driven-development** — every production file must ship alongside a failing-first test.
- **superpowers:verification-before-completion** — invoke before calling the plan done (Task 9.2).
- **superpowers:receiving-code-review** — invoke if a code reviewer raises concerns during the batch execution.
