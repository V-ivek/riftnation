import { CompositeSourceClient } from './composite.source-client';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from './official-catalog-client';
import { CardSourceRecord, SetSourceRecord } from '../../application/ports/source-records';

function makeCard(id: string, setId = 'UNL'): CardSourceRecord {
  return {
    id,
    set_id: setId,
    collector_number: 1,
    public_code: 'UNL-001/219',
    name: id,
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
    raw: { id },
  };
}

function makeSet(id: string): SetSourceRecord {
  return { id, name: id, collector_number_max: 219, raw: { id } };
}

function snapshot(
  cards: CardSourceRecord[],
  totalItems: number,
  fetchedVia: 'next-data' | 'playwright',
  sets: SetSourceRecord[] = [makeSet('UNL')],
): OfficialCatalogSnapshot {
  return {
    cards,
    sets,
    meta: {
      embeddedCount: cards.length,
      totalItems,
      resultsUpdatedAt: '2026-04-22T00:00:00Z',
      fetchedVia,
    },
  };
}

class StubClient implements OfficialCatalogClient {
  calls = 0;
  constructor(private readonly impl: () => Promise<OfficialCatalogSnapshot>) {}
  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    this.calls++;
    return this.impl();
  }
}

describe('CompositeSourceClient', () => {
  it('uses only the primary when the gap is within threshold', async () => {
    const primary = new StubClient(async () =>
      snapshot([makeCard('a'), makeCard('b')], 2, 'next-data'),
    );
    const fallback = new StubClient(async () => {
      throw new Error('fallback should not be called');
    });
    const composite = new CompositeSourceClient({ primary, fallback, threshold: 20 });
    const result = await composite.fetchCatalog();
    expect(result.meta.fetchedVia).toBe('next-data');
    expect(primary.calls).toBe(1);
    expect(fallback.calls).toBe(0);
  });

  it('triggers the fallback when the gap exceeds threshold and merges by id', async () => {
    const primary = new StubClient(async () =>
      snapshot([makeCard('a'), makeCard('b')], 100, 'next-data'),
    );
    const fallback = new StubClient(async () =>
      snapshot(
        [makeCard('b'), makeCard('c'), { ...makeCard('a'), name: 'FallbackA' }],
        100,
        'playwright',
      ),
    );
    const composite = new CompositeSourceClient({ primary, fallback, threshold: 20 });
    const result = await composite.fetchCatalog();
    expect(result.meta.fetchedVia).toBe('playwright');
    expect(primary.calls).toBe(1);
    expect(fallback.calls).toBe(1);

    const ids = result.cards.map((c) => c.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
    const cardA = result.cards.find((c) => c.id === 'a');
    expect(cardA!.name).toBe('FallbackA');
  });

  it('falls back when the primary throws', async () => {
    const primary = new StubClient(async () => {
      throw new Error('primary blew up');
    });
    const fallback = new StubClient(async () =>
      snapshot([makeCard('a')], 1, 'playwright'),
    );
    const composite = new CompositeSourceClient({ primary, fallback, threshold: 20 });
    const result = await composite.fetchCatalog();
    expect(result.meta.fetchedVia).toBe('playwright');
    expect(primary.calls).toBe(1);
    expect(fallback.calls).toBe(1);
  });

  it('propagates when both primary and fallback throw', async () => {
    const primary = new StubClient(async () => {
      throw new Error('primary failed');
    });
    const fallback = new StubClient(async () => {
      throw new Error('fallback failed');
    });
    const composite = new CompositeSourceClient({ primary, fallback, threshold: 20 });
    await expect(composite.fetchCatalog()).rejects.toThrow(/fallback failed/);
    expect(primary.calls).toBe(1);
    expect(fallback.calls).toBe(1);
  });

  it('defaults threshold to 20 (gap == 20 stays primary; gap > 20 triggers fallback)', async () => {
    const atThreshold = new CompositeSourceClient({
      primary: new StubClient(async () => snapshot([makeCard('a')], 21, 'next-data')),
      fallback: new StubClient(async () => snapshot([makeCard('a')], 21, 'playwright')),
    });
    expect((await atThreshold.fetchCatalog()).meta.fetchedVia).toBe('next-data');

    const overThreshold = new CompositeSourceClient({
      primary: new StubClient(async () => snapshot([makeCard('a')], 22, 'next-data')),
      fallback: new StubClient(async () => snapshot([makeCard('a'), makeCard('b')], 22, 'playwright')),
    });
    expect((await overThreshold.fetchCatalog()).meta.fetchedVia).toBe('playwright');
  });
});
