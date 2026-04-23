import * as fs from 'fs';
import * as path from 'path';
import { RiotSourceMapper } from './riot-source.mapper';

interface Fixture {
  cards: Record<string, unknown>[];
  sets: Record<string, unknown>[];
}

const fixture: Fixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../test/fixtures/riot-card-samples.json'), 'utf8'),
);

describe('RiotSourceMapper.toCardSourceRecord', () => {
  it('maps a spell card with full ability text and image', () => {
    const raw = fixture.cards.find((c: any) => c.id === 'unl-131-219') as any;
    if (!raw) return; // fixture version drift guard — skip if id missing
    const record = RiotSourceMapper.toCardSourceRecord(raw);
    expect(record.id).toBe('unl-131-219');
    expect(record.set_id).toBe('UNL');
    expect(record.collector_number).toBe(131);
    expect(record.public_code).toBe('UNL-131/219');
    expect(record.name).toBe('Abandon');
    expect(record.rarity).toBe('uncommon');
    expect(record.card_types).toEqual(['spell']);
    expect(record.card_super_type).toBeNull();
    expect(record.domains).toEqual(['chaos']);
    expect(record.energy_cost).toBe(2);
    expect(record.orientation).toBe('portrait');
    expect(record.rules_text_html).toContain('Counter a spell');
    expect(record.effect_text_html).toBeNull();
    expect(record.image_url).toMatch(/^https:\/\/cmsassets\.rgpub\.io\//);
    expect(record.image_alt).toMatch(/Abandon/);
    expect(record.illustrators).toContain('Kudos Productions');
    expect(record.tags).toEqual(expect.any(Array));
    expect(record.raw).toEqual(raw);
  });

  it('maps every fixture card and preserves counts', () => {
    const records = fixture.cards.map((c) => RiotSourceMapper.toCardSourceRecord(c));
    expect(records).toHaveLength(fixture.cards.length);
    for (const r of records) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.set_id).toBe('string');
      expect(r.card_types.length).toBeGreaterThan(0);
      expect(r.domains.length).toBeGreaterThan(0);
      expect(r.orientation === 'portrait' || r.orientation === 'landscape').toBe(true);
      expect(r.image_url).toMatch(/^https:\/\//);
    }
  });

  it('surfaces superType, multi-domain, mightBonus, effect, and power when present', () => {
    const records = fixture.cards.map((c) => RiotSourceMapper.toCardSourceRecord(c));
    expect(records.some((r) => r.card_super_type === 'champion')).toBe(true);
    expect(records.some((r) => r.card_super_type === 'signature')).toBe(true);
    expect(records.some((r) => r.card_super_type === 'token')).toBe(true);
    expect(records.some((r) => r.card_super_type === 'basic')).toBe(true);
    expect(records.some((r) => r.domains.length > 1)).toBe(true);
    expect(records.some((r) => r.might_bonus !== null)).toBe(true);
    expect(records.some((r) => r.effect_text_html !== null)).toBe(true);
    expect(records.some((r) => r.power !== null)).toBe(true);
  });

  it('maps cards whose energy / might / power are absent to null', () => {
    const record = RiotSourceMapper.toCardSourceRecord({
      id: 'x-1-2',
      set: { value: { id: 'X' } },
      collectorNumber: 1,
      publicCode: 'X-001/002',
      name: 'No Stats',
      rarity: { value: { id: 'common' } },
      cardType: { type: [{ id: 'battlefield' }] },
      domain: { values: [{ id: 'colorless' }] },
      orientation: 'portrait',
      text: { richText: { body: '<p>x</p>' } },
      cardImage: { url: 'https://cdn/x.png' },
      illustrator: { values: [] },
    } as unknown as Record<string, unknown>);
    expect(record.energy_cost).toBeNull();
    expect(record.might).toBeNull();
    expect(record.power).toBeNull();
    expect(record.might_bonus).toBeNull();
    expect(record.effect_text_html).toBeNull();
    expect(record.image_alt).toBeNull();
    expect(record.card_super_type).toBeNull();
    expect(record.illustrators).toEqual([]);
    expect(record.tags).toEqual([]);
  });
});

describe('RiotSourceMapper.toSetSourceRecord', () => {
  it('maps every fixture set', () => {
    const records = fixture.sets.map((s) => RiotSourceMapper.toSetSourceRecord(s));
    expect(records).toHaveLength(fixture.sets.length);
    for (const r of records) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.name).toBe('string');
      expect(r.collector_number_max).toBeGreaterThan(0);
      expect(r.raw).toBeDefined();
    }
  });
});

describe('RiotSourceMapper.mapSnapshot', () => {
  it('deduplicates cards by id (handles upstream duplicates)', () => {
    const dupe = { ...fixture.cards[0] };
    const input = {
      cards: [fixture.cards[0], dupe, fixture.cards[1]],
      sets: fixture.sets,
    };
    const out = RiotSourceMapper.mapSnapshot(input);
    expect(out.cards.length).toBe(2);
    const ids = out.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('deduplicates sets by id', () => {
    const input = {
      cards: fixture.cards,
      sets: [fixture.sets[0], { ...fixture.sets[0] }],
    };
    const out = RiotSourceMapper.mapSnapshot(input);
    expect(out.sets.length).toBe(1);
  });
});
