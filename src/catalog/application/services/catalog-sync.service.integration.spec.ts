import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { SetOrmEntity } from '../../infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from '../../infrastructure/persistence/entities/card.orm-entity';
import { InitCatalog1713412800000 } from '../../infrastructure/persistence/migrations/1713412800000-init-catalog';
import { SetFactory } from '../factories/set.factory';
import { CardFactory } from '../factories/card.factory';
import { CatalogSyncService } from './catalog-sync.service';
import { CardSourceRecord, SetSourceRecord } from '../ports/source-records';
import { OfficialCatalogSnapshot } from '../../infrastructure/source/official-catalog-client';

const unlSet: SetSourceRecord = {
  id: 'UNL',
  name: 'Unleashed',
  collector_number_max: 219,
  raw: { id: 'UNL' },
};

function makeCard(overrides: Partial<CardSourceRecord> = {}): CardSourceRecord {
  return {
    id: 'unl-001-219',
    set_id: 'UNL',
    collector_number: 1,
    public_code: 'UNL-001/219',
    name: 'Abandon',
    rarity: 'uncommon',
    card_types: ['spell'],
    card_super_type: null,
    domains: ['chaos'],
    energy_cost: 2,
    might: null,
    power: null,
    might_bonus: null,
    orientation: 'portrait',
    rules_text_html: '<p>Counter a spell.</p>',
    effect_text_html: null,
    image_url: 'https://cdn.example.com/x.png',
    image_alt: null,
    illustrators: ['Kudos Productions'],
    tags: [],
    raw: { id: 'unl-001-219' },
    ...overrides,
  };
}

function snapshot(cards: CardSourceRecord[], sets: SetSourceRecord[] = [unlSet]): OfficialCatalogSnapshot {
  return {
    sets,
    cards,
    meta: {
      embeddedCount: cards.length,
      totalItems: cards.length,
      resultsUpdatedAt: '2026-04-18T00:00:00Z',
      fetchedVia: 'next-data',
    },
  };
}

describe('CatalogSyncService.syncBatch', () => {
  let container: StartedPostgreSqlContainer;
  let ds: DataSource;
  let service: CatalogSyncService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    ds = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      entities: [SetOrmEntity, CardOrmEntity],
      migrations: [InitCatalog1713412800000],
    });
    await ds.initialize();
    await ds.runMigrations();
    service = new CatalogSyncService(ds, new SetFactory(), new CardFactory());
  }, 60_000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
    await container?.stop();
  });

  afterEach(async () => {
    await ds.query('DELETE FROM cards');
    await ds.query('DELETE FROM sets');
  });

  it('inserts sets and cards on first run', async () => {
    const summary = await service.syncBatch(
      snapshot([
        makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' }),
        makeCard({ id: 'unl-002-219', collector_number: 2, public_code: 'UNL-002/219', name: 'Second' }),
      ]),
    );
    expect(summary.sets.added).toBe(1);
    expect(summary.cards.added).toBe(2);
    expect(summary.cards.unchanged).toBe(0);
    expect(summary.cards.tombstoned).toBe(0);

    const count = await ds.query('SELECT COUNT(*)::int AS n FROM cards');
    expect(count[0].n).toBe(2);
  });

  it('is idempotent on unchanged input', async () => {
    const snap = snapshot([makeCard()]);
    await service.syncBatch(snap);
    const second = await service.syncBatch(snap);
    expect(second.cards.added).toBe(0);
    expect(second.cards.updated).toBe(0);
    expect(second.cards.unchanged).toBe(1);
    expect(second.sets.added).toBe(0);
    expect(second.sets.unchanged).toBe(1);
  });

  it('updates changed fields and counts one CardMetadataChanged', async () => {
    await service.syncBatch(snapshot([makeCard({ might: null, power: null })]));
    const second = await service.syncBatch(snapshot([makeCard({ might: null, power: 3 })]));
    expect(second.cards.updated).toBe(1);
    expect(second.cards.unchanged).toBe(0);
    const [row] = await ds.query('SELECT power FROM cards WHERE id = $1', ['unl-001-219']);
    expect(row.power).toBe(3);
  });

  it('tombstones cards that disappear from the snapshot', async () => {
    await service.syncBatch(
      snapshot([
        makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' }),
        makeCard({ id: 'unl-002-219', collector_number: 2, public_code: 'UNL-002/219', name: 'Second' }),
      ]),
    );
    const second = await service.syncBatch(
      snapshot([makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' })]),
    );
    expect(second.cards.tombstoned).toBe(1);
    const [row] = await ds.query('SELECT deleted_at FROM cards WHERE id = $1', ['unl-002-219']);
    expect(row.deleted_at).not.toBeNull();
  });

  it('restores a previously tombstoned card that re-appears', async () => {
    await service.syncBatch(
      snapshot([
        makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' }),
        makeCard({ id: 'unl-002-219', collector_number: 2, public_code: 'UNL-002/219', name: 'Second' }),
      ]),
    );
    await service.syncBatch(
      snapshot([makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' })]),
    );
    const third = await service.syncBatch(
      snapshot([
        makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' }),
        makeCard({ id: 'unl-002-219', collector_number: 2, public_code: 'UNL-002/219', name: 'Second' }),
      ]),
    );
    expect(third.cards.restored).toBe(1);
    const [row] = await ds.query('SELECT deleted_at FROM cards WHERE id = $1', ['unl-002-219']);
    expect(row.deleted_at).toBeNull();
  });

  it('rolls back on a mid-run VO violation', async () => {
    const good1 = makeCard({ id: 'unl-001-219', collector_number: 1, public_code: 'UNL-001/219' });
    const good2 = makeCard({ id: 'unl-002-219', collector_number: 2, public_code: 'UNL-002/219', name: 'Second' });
    const bad = makeCard({ id: 'unl-003-219', collector_number: 3, public_code: 'UNL-003/219', name: '' });
    await expect(service.syncBatch(snapshot([good1, good2, bad]))).rejects.toThrow(/CardName/);
    const count = await ds.query('SELECT COUNT(*)::int AS n FROM cards');
    expect(count[0].n).toBe(0);
    const setCount = await ds.query('SELECT COUNT(*)::int AS n FROM sets');
    expect(setCount[0].n).toBe(0);
  });

  it('syncs the set when its name changes', async () => {
    await service.syncBatch(snapshot([makeCard()], [unlSet]));
    const second = await service.syncBatch(
      snapshot([makeCard()], [{ ...unlSet, name: 'Unleashed Remastered' }]),
    );
    expect(second.sets.updated).toBe(1);
    const [row] = await ds.query('SELECT name FROM sets WHERE id = $1', ['UNL']);
    expect(row.name).toBe('Unleashed Remastered');
  });
});
