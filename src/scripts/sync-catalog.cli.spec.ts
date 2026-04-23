import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { CatalogModule } from '../catalog/catalog.module';
import { SetOrmEntity } from '../catalog/infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from '../catalog/infrastructure/persistence/entities/card.orm-entity';
import { InitCatalog1713412800000 } from '../catalog/infrastructure/persistence/migrations/1713412800000-init-catalog';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from '../catalog/infrastructure/source/official-catalog-client';
import { CardSourceRecord, SetSourceRecord } from '../catalog/application/ports/source-records';
import { runSyncCatalog } from './sync-catalog.cli';

const card: CardSourceRecord = {
  id: 'unl-001-219',
  set_id: 'UNL',
  collector_number: 1,
  public_code: 'UNL-001/219',
  name: 'Abandon',
  rarity: 'common',
  card_types: ['spell'],
  card_super_type: null,
  domains: ['chaos'],
  energy_cost: null,
  might: null,
  power: null,
  might_bonus: null,
  orientation: 'portrait',
  rules_text_html: '<p>.</p>',
  effect_text_html: null,
  image_url: 'https://example.com/x.png',
  image_alt: null,
  illustrators: [],
  tags: [],
  raw: { id: 'unl-001-219' },
};

const setRecord: SetSourceRecord = {
  id: 'UNL',
  name: 'Unleashed',
  collector_number_max: 219,
  raw: { id: 'UNL' },
};

class HappyClient implements OfficialCatalogClient {
  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    return {
      cards: [card],
      sets: [setRecord],
      meta: {
        embeddedCount: 1,
        totalItems: 1,
        resultsUpdatedAt: '2026-04-22T00:00:00Z',
        fetchedVia: 'next-data',
      },
    };
  }
}

class AngryClient implements OfficialCatalogClient {
  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    throw new Error('source unreachable');
  }
}

describe('runSyncCatalog', () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
  }, 60_000);

  afterAll(async () => {
    await container?.stop();
  });

  async function buildApp(client: OfficialCatalogClient): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [SetOrmEntity, CardOrmEntity],
          migrations: [InitCatalog1713412800000],
          migrationsRun: true,
        }),
        CatalogModule.forTest({ sourceClient: client }),
      ],
    }).compile();
  }

  it('returns ok:true with a JSON summary on success', async () => {
    const mod = await buildApp(new HappyClient());
    try {
      const result = await runSyncCatalog(mod);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.output);
      expect(parsed.ok).toBe(true);
      expect(parsed.cards.added).toBe(1);
      expect(parsed.sets.added).toBe(1);
      expect(parsed.fetchedVia).toBe('next-data');
    } finally {
      await mod.close();
    }
  });

  it('returns ok:false with a JSON error on failure', async () => {
    const mod = await buildApp(new AngryClient());
    try {
      const result = await runSyncCatalog(mod);
      expect(result.exitCode).toBe(1);
      const parsed = JSON.parse(result.output);
      expect(parsed.ok).toBe(false);
      expect(parsed.error).toMatch(/source unreachable/);
    } finally {
      await mod.close();
    }
  });
});
