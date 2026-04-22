import { CardAggregate, CardAggregateCreateParams, CardAggregateRefreshParams } from './card.aggregate';
import { CardId } from '../value-objects/card-id.vo';
import { SetId } from '../value-objects/set-id.vo';
import { CollectorNumber } from '../value-objects/collector-number.vo';
import { CardName } from '../value-objects/card-name.vo';
import { PublicCode } from '../value-objects/public-code.vo';
import { CardSuperType } from '../value-objects/card-super-type.vo';
import { Power } from '../value-objects/power.vo';
import { MightBonus } from '../value-objects/might-bonus.vo';
import { Orientation } from '../value-objects/orientation.vo';
import { EffectTextHtml } from '../value-objects/effect-text-html.vo';
import { Tag } from '../value-objects/tag.vo';

const now = new Date('2026-04-18T00:00:00Z');

function baselineCreate(overrides: Partial<CardAggregateCreateParams> = {}): CardAggregateCreateParams {
  return {
    id: CardId.create('unl-131-219'),
    setId: SetId.create('UNL'),
    collectorNumber: CollectorNumber.create(131),
    name: CardName.create('Abandon'),
    publicCode: PublicCode.create('UNL-131/219'),
    rarity: 'uncommon',
    cardTypes: ['spell'],
    cardSuperType: null,
    domains: ['chaos'],
    energyCost: 2,
    might: null,
    power: null,
    mightBonus: null,
    orientation: Orientation.create('portrait'),
    rulesTextHtml: '<p>Counter a spell.</p>',
    effectTextHtml: null,
    imageUrl: 'https://cdn.example.com/abandon.png',
    imageAlt: 'Abandon spell',
    illustrators: ['Kudos Productions'],
    tags: [],
    raw: { id: 'unl-131-219' },
    syncedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function baselineRefresh(overrides: Partial<CardAggregateRefreshParams> = {}): CardAggregateRefreshParams {
  return {
    collectorNumber: CollectorNumber.create(131),
    name: CardName.create('Abandon'),
    publicCode: PublicCode.create('UNL-131/219'),
    rarity: 'uncommon',
    cardTypes: ['spell'],
    cardSuperType: null,
    domains: ['chaos'],
    energyCost: 2,
    might: null,
    power: null,
    mightBonus: null,
    orientation: Orientation.create('portrait'),
    rulesTextHtml: '<p>Counter a spell.</p>',
    effectTextHtml: null,
    imageUrl: 'https://cdn.example.com/abandon.png',
    imageAlt: 'Abandon spell',
    illustrators: ['Kudos Productions'],
    tags: [],
    raw: { id: 'unl-131-219' },
    syncedAt: now,
    ...overrides,
  };
}

describe('CardAggregate (baseline RFC fields)', () => {
  it('creates with all baseline fields and exposes getters', () => {
    const card = CardAggregate.create(baselineCreate());
    expect(card.id.toString()).toBe('unl-131-219');
    expect(card.setId.toString()).toBe('UNL');
    expect(card.collectorNumber).toBe(131);
    expect(card.name).toBe('Abandon');
    expect(card.rarity).toBe('uncommon');
    expect(card.cardTypes).toEqual(['spell']);
    expect(card.domains).toEqual(['chaos']);
    expect(card.energyCost).toBe(2);
    expect(card.might).toBeNull();
    expect(card.rulesTextHtml).toBe('<p>Counter a spell.</p>');
    expect(card.imageUrl).toBe('https://cdn.example.com/abandon.png');
    expect(card.imageAlt).toBe('Abandon spell');
    expect(card.illustrators).toEqual(['kudos productions']);
    expect(card.raw).toEqual({ id: 'unl-131-219' });
    expect(card.syncedAt).toEqual(now);
  });

  it('rejects negative energyCost and might', () => {
    expect(() => CardAggregate.create(baselineCreate({ energyCost: -1 }))).toThrow(/energy/i);
    expect(() => CardAggregate.create(baselineCreate({ might: -1 }))).toThrow(/might/i);
  });

  it('normalizes cardTypes, domains, illustrators — trim, lowercase, unique', () => {
    const card = CardAggregate.create(
      baselineCreate({
        cardTypes: [' Spell ', 'spell', 'UNIT'],
        domains: ['Chaos', ' order ', 'chaos'],
        illustrators: ['Kudos Productions', '  kudos productions ', 'Alice'],
      }),
    );
    expect(card.cardTypes).toEqual(['spell', 'unit']);
    expect(card.domains).toEqual(['chaos', 'order']);
    expect(card.illustrators).toEqual(['kudos productions', 'alice']);
  });

  it('hasType is case-insensitive', () => {
    const card = CardAggregate.create(baselineCreate({ cardTypes: ['spell'] }));
    expect(card.hasType('Spell')).toBe(true);
    expect(card.hasType('unit')).toBe(false);
  });

  it('hasDomain is case-insensitive', () => {
    const card = CardAggregate.create(baselineCreate({ domains: ['chaos', 'order'] }));
    expect(card.hasDomain('CHAOS')).toBe(true);
    expect(card.hasDomain('fury')).toBe(false);
  });

  it('belongsToSet compares SetId values', () => {
    const card = CardAggregate.create(baselineCreate());
    expect(card.belongsToSet(SetId.create('UNL'))).toBe(true);
    expect(card.belongsToSet(SetId.create('OGN'))).toBe(false);
  });

  it('refreshFromSource replaces state', () => {
    const card = CardAggregate.create(baselineCreate());
    const later = new Date('2026-04-19T00:00:00Z');
    card.refreshFromSource(
      baselineRefresh({
        rarity: 'rare',
        might: 5,
        cardTypes: ['unit'],
        syncedAt: later,
      }),
    );
    expect(card.rarity).toBe('rare');
    expect(card.might).toBe(5);
    expect(card.cardTypes).toEqual(['unit']);
    expect(card.syncedAt).toEqual(later);
  });

  it('rejects blank values inside cardTypes / domains / illustrators', () => {
    expect(() =>
      CardAggregate.create(baselineCreate({ cardTypes: ['spell', '   '] })),
    ).not.toThrow();
    const card = CardAggregate.create(
      baselineCreate({ cardTypes: ['spell', '   '], domains: [''] }),
    );
    expect(card.cardTypes).toEqual(['spell']);
    expect(card.domains).toEqual([]);
  });
});

describe('CardAggregate (addendum fields)', () => {
  it('stores and exposes all addendum fields as primitives', () => {
    const card = CardAggregate.create(
      baselineCreate({
        publicCode: PublicCode.create('UNL-131/219'),
        cardSuperType: CardSuperType.create('champion'),
        power: Power.create(2),
        mightBonus: MightBonus.create(3),
        orientation: Orientation.create('portrait'),
        effectTextHtml: EffectTextHtml.create('<p>effect</p>'),
        tags: ['Mech', 'Piltover'].map(Tag.create),
      }),
    );
    expect(card.publicCode).toBe('UNL-131/219');
    expect(card.cardSuperType).toBe('champion');
    expect(card.power).toBe(2);
    expect(card.mightBonus).toBe(3);
    expect(card.orientation).toBe('portrait');
    expect(card.effectTextHtml).toBe('<p>effect</p>');
    expect(card.tags).toEqual(['mech', 'piltover']);
    expect(card.deletedAt).toBeNull();
  });

  it('keeps optional addendum fields as null when unset', () => {
    const card = CardAggregate.create(baselineCreate());
    expect(card.cardSuperType).toBeNull();
    expect(card.power).toBeNull();
    expect(card.mightBonus).toBeNull();
    expect(card.effectTextHtml).toBeNull();
  });

  it('defaults tags to []', () => {
    const card = CardAggregate.create(baselineCreate({ tags: [] }));
    expect(card.tags).toEqual([]);
  });

  it('deduplicates and lowercases tags via the aggregate normalizer', () => {
    const card = CardAggregate.create(
      baselineCreate({ tags: [Tag.create('Mech'), Tag.create('mech'), Tag.create('Piltover')] }),
    );
    expect(card.tags).toEqual(['mech', 'piltover']);
  });

  it('rejects deletedAt in the future on create', () => {
    const future = new Date(Date.now() + 60_000);
    expect(() => CardAggregate.create(baselineCreate({ deletedAt: future }))).toThrow(/deletedAt/i);
  });

  it('refreshFromSource updates addendum fields', () => {
    const card = CardAggregate.create(baselineCreate());
    card.refreshFromSource(baselineRefresh({ power: Power.create(5), cardSuperType: CardSuperType.create('signature') }));
    expect(card.power).toBe(5);
    expect(card.cardSuperType).toBe('signature');
  });

  it('markDeleted sets a tombstone; restore clears it', () => {
    const card = CardAggregate.create(baselineCreate());
    const at = new Date('2026-04-18T12:00:00Z');
    card.markDeleted(at);
    expect(card.deletedAt).toEqual(at);
    card.restore();
    expect(card.deletedAt).toBeNull();
  });

  it('markDeleted rejects a future timestamp', () => {
    const card = CardAggregate.create(baselineCreate());
    const future = new Date(Date.now() + 60_000);
    expect(() => card.markDeleted(future)).toThrow(/deletedAt/i);
  });
});
