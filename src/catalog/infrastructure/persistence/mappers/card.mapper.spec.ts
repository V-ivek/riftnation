import { CardMapper } from './card.mapper';
import { CardAggregate } from '../../../domain/aggregates/card.aggregate';
import { CardId } from '../../../domain/value-objects/card-id.vo';
import { SetId } from '../../../domain/value-objects/set-id.vo';
import { CollectorNumber } from '../../../domain/value-objects/collector-number.vo';
import { CardName } from '../../../domain/value-objects/card-name.vo';
import { PublicCode } from '../../../domain/value-objects/public-code.vo';
import { CardSuperType } from '../../../domain/value-objects/card-super-type.vo';
import { Power } from '../../../domain/value-objects/power.vo';
import { MightBonus } from '../../../domain/value-objects/might-bonus.vo';
import { Orientation } from '../../../domain/value-objects/orientation.vo';
import { EffectTextHtml } from '../../../domain/value-objects/effect-text-html.vo';
import { Tag } from '../../../domain/value-objects/tag.vo';

describe('CardMapper', () => {
  const now = new Date('2026-04-18T00:00:00Z');

  const aggregate = () =>
    CardAggregate.create({
      id: CardId.create('unl-131-219'),
      setId: SetId.create('UNL'),
      collectorNumber: CollectorNumber.create(131),
      name: CardName.create('Abandon'),
      publicCode: PublicCode.create('UNL-131/219'),
      rarity: 'uncommon',
      cardTypes: ['spell'],
      cardSuperType: CardSuperType.create('signature'),
      domains: ['chaos'],
      energyCost: 2,
      might: null,
      power: Power.create(4),
      mightBonus: MightBonus.create(3),
      orientation: Orientation.create('portrait'),
      rulesTextHtml: '<p>Counter a spell.</p>',
      effectTextHtml: EffectTextHtml.create('<p>effect</p>'),
      imageUrl: 'https://cdn.example.com/abandon.png',
      imageAlt: 'Abandon spell',
      illustrators: ['Kudos Productions'],
      tags: ['Mech'].map(Tag.create),
      raw: { id: 'unl-131-219' },
      syncedAt: now,
    });

  it('round-trips every addendum field', () => {
    const original = aggregate();
    const entity = CardMapper.toPersistence(original);
    expect(entity.id).toBe('unl-131-219');
    expect(entity.setId).toBe('UNL');
    expect(entity.collectorNumber).toBe(131);
    expect(entity.publicCode).toBe('UNL-131/219');
    expect(entity.name).toBe('Abandon');
    expect(entity.rarity).toBe('uncommon');
    expect(entity.cardTypes).toEqual(['spell']);
    expect(entity.cardSuperType).toBe('signature');
    expect(entity.domains).toEqual(['chaos']);
    expect(entity.energyCost).toBe(2);
    expect(entity.might).toBeNull();
    expect(entity.power).toBe(4);
    expect(entity.mightBonus).toBe(3);
    expect(entity.orientation).toBe('portrait');
    expect(entity.rulesTextHtml).toBe('<p>Counter a spell.</p>');
    expect(entity.effectTextHtml).toBe('<p>effect</p>');
    expect(entity.imageUrl).toBe('https://cdn.example.com/abandon.png');
    expect(entity.imageAlt).toBe('Abandon spell');
    expect(entity.illustrators).toEqual(['kudos productions']);
    expect(entity.tags).toEqual(['mech']);
    expect(entity.raw).toEqual({ id: 'unl-131-219' });
    expect(entity.deletedAt).toBeNull();
    expect(entity.syncedAt).toEqual(now);

    const rebuilt = CardMapper.toDomain(entity);
    expect(rebuilt.id.toString()).toBe('unl-131-219');
    expect(rebuilt.publicCode).toBe('UNL-131/219');
    expect(rebuilt.cardSuperType).toBe('signature');
    expect(rebuilt.power).toBe(4);
    expect(rebuilt.mightBonus).toBe(3);
    expect(rebuilt.orientation).toBe('portrait');
    expect(rebuilt.effectTextHtml).toBe('<p>effect</p>');
    expect(rebuilt.tags).toEqual(['mech']);
    expect(rebuilt.deletedAt).toBeNull();
  });

  it('round-trips a tombstoned card', () => {
    const original = aggregate();
    const at = new Date('2026-04-18T12:00:00Z');
    original.markDeleted(at);

    const entity = CardMapper.toPersistence(original);
    expect(entity.deletedAt).toEqual(at);

    const rebuilt = CardMapper.toDomain(entity);
    expect(rebuilt.deletedAt).toEqual(at);
  });

  it('round-trips a minimal (nullable-heavy) card', () => {
    const card = CardAggregate.create({
      id: CardId.create('ogn-001-298'),
      setId: SetId.create('OGN'),
      collectorNumber: CollectorNumber.create(1),
      name: CardName.create('Basic'),
      publicCode: PublicCode.create('OGN-001/298'),
      rarity: 'common',
      cardTypes: ['unit'],
      domains: ['colorless'],
      orientation: Orientation.create('landscape'),
      rulesTextHtml: '<p>plain</p>',
      imageUrl: 'https://cdn.example.com/x.png',
      illustrators: [],
      tags: [],
      raw: {},
      syncedAt: now,
    });
    const entity = CardMapper.toPersistence(card);
    const rebuilt = CardMapper.toDomain(entity);
    expect(rebuilt.cardSuperType).toBeNull();
    expect(rebuilt.power).toBeNull();
    expect(rebuilt.mightBonus).toBeNull();
    expect(rebuilt.effectTextHtml).toBeNull();
    expect(rebuilt.imageAlt).toBeNull();
    expect(rebuilt.illustrators).toEqual([]);
    expect(rebuilt.tags).toEqual([]);
    expect(rebuilt.orientation).toBe('landscape');
  });
});
