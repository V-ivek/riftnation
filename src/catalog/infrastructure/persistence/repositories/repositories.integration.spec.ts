import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource, Repository } from 'typeorm';
import { SetOrmEntity } from '../entities/set.orm-entity';
import { CardOrmEntity } from '../entities/card.orm-entity';
import { InitCatalog1713412800000 } from '../migrations/1713412800000-init-catalog';
import { SetRepositoryImpl } from './set.repository.impl';
import { CardRepositoryImpl } from './card.repository.impl';
import { SetAggregate } from '../../../domain/aggregates/set.aggregate';
import { CardAggregate } from '../../../domain/aggregates/card.aggregate';
import { SetId } from '../../../domain/value-objects/set-id.vo';
import { CardId } from '../../../domain/value-objects/card-id.vo';
import { CollectorNumber } from '../../../domain/value-objects/collector-number.vo';
import { CardName } from '../../../domain/value-objects/card-name.vo';
import { PublicCode } from '../../../domain/value-objects/public-code.vo';
import { Orientation } from '../../../domain/value-objects/orientation.vo';

describe('Repository implementations (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let ds: DataSource;
  let setRepo: SetRepositoryImpl;
  let cardRepo: CardRepositoryImpl;
  const now = new Date('2026-04-18T00:00:00Z');

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

    const setOrm: Repository<SetOrmEntity> = ds.getRepository(SetOrmEntity);
    const cardOrm: Repository<CardOrmEntity> = ds.getRepository(CardOrmEntity);
    setRepo = new SetRepositoryImpl(setOrm);
    cardRepo = new CardRepositoryImpl(cardOrm);
  }, 60_000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
    await container?.stop();
  });

  const buildSet = (id: string, name: string, max: number) =>
    SetAggregate.create({
      id: SetId.create(id),
      name,
      collectorNumberMax: CollectorNumber.create(max),
      raw: { id, name },
      syncedAt: now,
    });

  const buildCard = (setId: string, collectorNumber: number) => {
    const id = `${setId.toLowerCase()}-${String(collectorNumber).padStart(3, '0')}-219`;
    return CardAggregate.create({
      id: CardId.create(id),
      setId: SetId.create(setId),
      collectorNumber: CollectorNumber.create(collectorNumber),
      name: CardName.create(`Card ${collectorNumber}`),
      publicCode: PublicCode.create(`${setId}-${String(collectorNumber).padStart(3, '0')}/219`),
      rarity: 'common',
      cardTypes: ['spell'],
      domains: ['chaos'],
      orientation: Orientation.create('portrait'),
      rulesTextHtml: '<p>x</p>',
      imageUrl: 'https://cdn.example.com/x.png',
      illustrators: [],
      tags: [],
      raw: { id },
      syncedAt: now,
    });
  };

  it('SetRepository saves, finds, and exists', async () => {
    const unl = buildSet('UNL', 'Unleashed', 219);
    await setRepo.save(unl);

    const found = await setRepo.findById(SetId.create('UNL'));
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Unleashed');
    expect(found!.collectorNumberMax).toBe(219);

    expect(await setRepo.existsById(SetId.create('UNL'))).toBe(true);
    expect(await setRepo.existsById(SetId.create('DOES_NOT_EXIST'))).toBe(false);
  });

  it('CardRepository saves, finds, lists by set', async () => {
    const cardA = buildCard('UNL', 1);
    const cardB = buildCard('UNL', 2);
    await cardRepo.save(cardA);
    await cardRepo.save(cardB);

    const loaded = await cardRepo.findById(CardId.create('unl-001-219'));
    expect(loaded).not.toBeNull();
    expect(loaded!.collectorNumber).toBe(1);

    const bySet = await cardRepo.findBySetId(SetId.create('UNL'), 100, 0);
    const numbers = bySet.map((c) => c.collectorNumber).sort();
    expect(numbers).toEqual([1, 2]);
  });

  it('findIdsBySet returns every CardId linked to the set (for tombstone diff)', async () => {
    const ids = await cardRepo.findIdsBySet(SetId.create('UNL'));
    const asStrings = ids.map((i) => i.toString()).sort();
    expect(asStrings).toEqual(['unl-001-219', 'unl-002-219']);
  });

  it('save is an upsert (idempotent on repeat)', async () => {
    const cardA = buildCard('UNL', 1);
    await cardRepo.save(cardA);
    const bySet = await cardRepo.findBySetId(SetId.create('UNL'));
    expect(bySet.filter((c) => c.collectorNumber === 1)).toHaveLength(1);
  });

  it('persists tombstones (deleted_at) through save / load', async () => {
    const card = buildCard('UNL', 2);
    const at = new Date('2026-04-18T12:00:00Z');
    card.markDeleted(at);
    await cardRepo.save(card);

    const loaded = await cardRepo.findById(CardId.create('unl-002-219'));
    expect(loaded!.deletedAt).toEqual(at);
  });
});
