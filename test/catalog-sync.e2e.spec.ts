import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { CatalogModule } from '../src/catalog/catalog.module';
import { SetOrmEntity } from '../src/catalog/infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from '../src/catalog/infrastructure/persistence/entities/card.orm-entity';
import { InitCatalog1713412800000 } from '../src/catalog/infrastructure/persistence/migrations/1713412800000-init-catalog';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from '../src/catalog/infrastructure/source/official-catalog-client';
import { RiotSourceMapper } from '../src/catalog/infrastructure/source/riot-source.mapper';
import { runSyncCatalog } from '../src/scripts/sync-catalog.cli';

interface RiotFixture {
  cards: Record<string, unknown>[];
  sets: Record<string, unknown>[];
}

const raw: RiotFixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'fixtures/riot-card-samples.json'), 'utf8'),
);

const { cards: fixtureCards, sets: fixtureSets } = RiotSourceMapper.mapSnapshot({
  cards: raw.cards,
  sets: raw.sets,
});

class FixtureSourceClient implements OfficialCatalogClient {
  constructor(
    private readonly cards = fixtureCards,
    private readonly sets = fixtureSets,
  ) {}
  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    return {
      cards: this.cards,
      sets: this.sets,
      meta: {
        embeddedCount: this.cards.length,
        totalItems: this.cards.length,
        resultsUpdatedAt: '2026-04-22T00:00:00Z',
        fetchedVia: 'next-data',
      },
    };
  }
}

describe('catalog-sync end-to-end', () => {
  let container: StartedPostgreSqlContainer;
  let mod: TestingModule;
  let ds: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    mod = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [SetOrmEntity, CardOrmEntity],
          migrations: [InitCatalog1713412800000],
          migrationsRun: true,
        }),
        CatalogModule.forTest({ sourceClient: new FixtureSourceClient() }),
      ],
    }).compile();
    ds = mod.get(DataSource);
  }, 60_000);

  afterAll(async () => {
    await mod?.close();
    await container?.stop();
  });

  it('syncs every fixture card and set on first run', async () => {
    const result = await runSyncCatalog(mod);
    expect(result.exitCode).toBe(0);

    const parsed = JSON.parse(result.output);
    expect(parsed.ok).toBe(true);
    expect(parsed.sets.added).toBe(fixtureSets.length);
    expect(parsed.cards.added).toBe(fixtureCards.length);
    expect(parsed.cards.tombstoned).toBe(0);

    const [{ n: cardRowCount }] = await ds.query(
      'SELECT COUNT(*)::int AS n FROM cards',
    );
    expect(cardRowCount).toBe(fixtureCards.length);

    const [{ n: setRowCount }] = await ds.query(
      'SELECT COUNT(*)::int AS n FROM sets',
    );
    expect(setRowCount).toBe(fixtureSets.length);
  });

  it('spot-checks a card with full addendum fields round-tripped', async () => {
    const candidate = fixtureCards.find(
      (c) =>
        c.card_super_type !== null &&
        c.power !== null &&
        c.orientation === 'portrait',
    );
    expect(candidate).toBeDefined();

    const [row] = await ds.query(
      'SELECT id, public_code, card_super_type, power, orientation, tags, card_types, domains FROM cards WHERE id = $1',
      [candidate!.id],
    );
    expect(row.public_code).toBe(candidate!.public_code.toUpperCase());
    expect(row.card_super_type).toBe(candidate!.card_super_type);
    expect(row.power).toBe(candidate!.power);
    expect(row.orientation).toBe(candidate!.orientation);
    expect(row.tags).toEqual(expect.arrayContaining([]));
    expect(row.card_types.length).toBeGreaterThan(0);
    expect(row.domains.length).toBeGreaterThan(0);
  });

  it('is idempotent on a second run', async () => {
    const result = await runSyncCatalog(mod);
    const parsed = JSON.parse(result.output);
    expect(parsed.ok).toBe(true);
    expect(parsed.sets.added).toBe(0);
    expect(parsed.sets.updated).toBe(0);
    expect(parsed.cards.added).toBe(0);
    expect(parsed.cards.updated).toBe(0);
    expect(parsed.cards.unchanged).toBe(fixtureCards.length);
  });
});
