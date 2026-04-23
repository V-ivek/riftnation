import { CardFactory } from './card.factory';
import { CardSourceRecord } from '../ports/source-records';

const baseRecord: CardSourceRecord = {
  id: 'unl-131-219',
  set_id: 'UNL',
  collector_number: 131,
  public_code: 'UNL-131/219',
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
  image_url: 'https://cdn.example.com/abandon.png',
  image_alt: 'Abandon spell',
  illustrators: ['Kudos Productions'],
  tags: [],
  raw: { id: 'unl-131-219' },
};

describe('CardFactory.fromSource', () => {
  const now = new Date('2026-04-18T00:00:00Z');

  it('builds a CardAggregate from a full RFC-shape record', () => {
    const card = new CardFactory().fromSource(baseRecord, now);
    expect(card.id.toString()).toBe('unl-131-219');
    expect(card.setId.toString()).toBe('UNL');
    expect(card.collectorNumber).toBe(131);
    expect(card.name).toBe('Abandon');
    expect(card.publicCode).toBe('UNL-131/219');
    expect(card.rarity).toBe('uncommon');
    expect(card.cardTypes).toEqual(['spell']);
    expect(card.cardSuperType).toBeNull();
    expect(card.domains).toEqual(['chaos']);
    expect(card.energyCost).toBe(2);
    expect(card.might).toBeNull();
    expect(card.power).toBeNull();
    expect(card.mightBonus).toBeNull();
    expect(card.orientation).toBe('portrait');
    expect(card.rulesTextHtml).toBe('<p>Counter a spell.</p>');
    expect(card.effectTextHtml).toBeNull();
    expect(card.imageUrl).toBe('https://cdn.example.com/abandon.png');
    expect(card.imageAlt).toBe('Abandon spell');
    expect(card.illustrators).toEqual(['kudos productions']);
    expect(card.tags).toEqual([]);
    expect(card.raw).toEqual({ id: 'unl-131-219' });
    expect(card.syncedAt).toEqual(now);
    expect(card.deletedAt).toBeNull();
  });

  it('maps populated addendum fields via VOs', () => {
    const card = new CardFactory().fromSource(
      {
        ...baseRecord,
        card_super_type: 'champion',
        power: 2,
        might_bonus: 3,
        orientation: 'landscape',
        effect_text_html: '<p>effect</p>',
        tags: ['Mech', 'Piltover'],
      },
      now,
    );
    expect(card.cardSuperType).toBe('champion');
    expect(card.power).toBe(2);
    expect(card.mightBonus).toBe(3);
    expect(card.orientation).toBe('landscape');
    expect(card.effectTextHtml).toBe('<p>effect</p>');
    expect(card.tags).toEqual(['mech', 'piltover']);
  });

  it('propagates VO invariant violations (empty card name)', () => {
    expect(() =>
      new CardFactory().fromSource({ ...baseRecord, name: '' }, now),
    ).toThrow(/CardName/);
  });

  it('propagates orientation invariant violations', () => {
    expect(() =>
      new CardFactory().fromSource({ ...baseRecord, orientation: 'square' }, now),
    ).toThrow(/Orientation/);
  });
});
