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
    if (ds?.isInitialized) await ds.destroy();
    await container?.stop();
  });

  it('creates sets with the expected columns', async () => {
    await ds.runMigrations();
    const cols: { column_name: string }[] = await ds.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'sets'`,
    );
    const names = cols.map((c) => c.column_name).sort();
    expect(names).toEqual(['collector_number_max', 'id', 'name', 'raw', 'synced_at']);
  });

  it('creates cards with every RFC + addendum column', async () => {
    const cols: { column_name: string; is_nullable: string }[] = await ds.query(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'cards'`,
    );
    const names = cols.map((c) => c.column_name);
    for (const expected of [
      'id',
      'set_id',
      'collector_number',
      'public_code',
      'name',
      'rarity',
      'card_types',
      'card_super_type',
      'domains',
      'energy_cost',
      'might',
      'power',
      'might_bonus',
      'orientation',
      'rules_text_html',
      'effect_text_html',
      'image_url',
      'image_alt',
      'illustrators',
      'tags',
      'raw',
      'deleted_at',
      'synced_at',
    ]) {
      expect(names).toContain(expected);
    }
    const nullability = Object.fromEntries(cols.map((c) => [c.column_name, c.is_nullable]));
    expect(nullability['card_super_type']).toBe('YES');
    expect(nullability['effect_text_html']).toBe('YES');
    expect(nullability['power']).toBe('YES');
    expect(nullability['might_bonus']).toBe('YES');
    expect(nullability['deleted_at']).toBe('YES');
    expect(nullability['image_alt']).toBe('YES');
    expect(nullability['public_code']).toBe('NO');
    expect(nullability['orientation']).toBe('NO');
    expect(nullability['tags']).toBe('NO');
  });

  it('creates the required indexes', async () => {
    const idx: { indexname: string }[] = await ds.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'cards'`,
    );
    const names = idx.map((i) => i.indexname);
    for (const expected of [
      'idx_cards_set_coll',
      'idx_cards_rarity',
      'idx_cards_card_types',
      'idx_cards_domains',
      'idx_cards_tags',
      'idx_cards_raw',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('enforces the orientation check constraint', async () => {
    await ds.query(
      `INSERT INTO sets (id, name, collector_number_max, raw) VALUES ('UNL', 'Unleashed', 219, '{}'::jsonb)`,
    );
    await expect(
      ds.query(
        `INSERT INTO cards (id, set_id, collector_number, public_code, name, rarity, orientation, rules_text_html, image_url, raw) VALUES ('t-1', 'UNL', 1, 'UNL-001/219', 'Test', 'common', 'square', '<p>t</p>', 'https://x', '{}'::jsonb)`,
      ),
    ).rejects.toThrow();
  });

  it('is idempotent when re-run', async () => {
    await ds.runMigrations();
    await ds.runMigrations();
  });
});
