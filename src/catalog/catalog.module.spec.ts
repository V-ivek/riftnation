import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { CatalogModule } from './catalog.module';
import { SetOrmEntity } from './infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from './infrastructure/persistence/entities/card.orm-entity';
import { InitCatalog1713412800000 } from './infrastructure/persistence/migrations/1713412800000-init-catalog';
import { CatalogSyncService } from './application/services/catalog-sync.service';
import {
  OFFICIAL_CATALOG_CLIENT,
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from './infrastructure/source/official-catalog-client';
import { SET_REPOSITORY, SetRepository } from './domain/repositories/set.repository';
import { CARD_REPOSITORY, CardRepository } from './domain/repositories/card.repository';

class FakeClient implements OfficialCatalogClient {
  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    return {
      cards: [],
      sets: [],
      meta: {
        embeddedCount: 0,
        totalItems: 0,
        resultsUpdatedAt: '',
        fetchedVia: 'next-data',
      },
    };
  }
}

describe('CatalogModule (wiring smoke)', () => {
  let container: StartedPostgreSqlContainer;
  let mod: TestingModule;

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
        CatalogModule.forTest({ sourceClient: new FakeClient() }),
      ],
    }).compile();
  }, 60_000);

  afterAll(async () => {
    await mod?.close();
    await container?.stop();
  });

  it('resolves CatalogSyncService', () => {
    const service = mod.get(CatalogSyncService);
    expect(service).toBeDefined();
  });

  it('resolves the source client bound via forTest', () => {
    const client = mod.get<OfficialCatalogClient>(OFFICIAL_CATALOG_CLIENT);
    expect(client).toBeInstanceOf(FakeClient);
  });

  it('resolves repositories', () => {
    expect(mod.get<SetRepository>(SET_REPOSITORY)).toBeDefined();
    expect(mod.get<CardRepository>(CARD_REPOSITORY)).toBeDefined();
  });
});
