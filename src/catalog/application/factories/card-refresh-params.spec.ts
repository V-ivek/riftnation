import { toCardRefreshParams } from './card-refresh-params';
import { CardSourceRecord } from '../ports/source-records';
import { CardAggregate } from '../../domain/aggregates/card.aggregate';
import { CardId } from '../../domain/value-objects/card-id.vo';
import { SetId } from '../../domain/value-objects/set-id.vo';
import { CollectorNumber } from '../../domain/value-objects/collector-number.vo';
import { CardName } from '../../domain/value-objects/card-name.vo';
import { PublicCode } from '../../domain/value-objects/public-code.vo';
import { Orientation } from '../../domain/value-objects/orientation.vo';

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

describe('toCardRefreshParams', () => {
  const now = new Date('2026-04-18T00:00:00Z');

  it('reconstructs VOs and preserves null-friendly fields', () => {
    const params = toCardRefreshParams(baseRecord, now);
    expect(params.collectorNumber.toNumber()).toBe(131);
    expect(params.name.toString()).toBe('Abandon');
    expect(params.publicCode.toString()).toBe('UNL-131/219');
    expect(params.cardSuperType).toBeNull();
    expect(params.power).toBeNull();
    expect(params.mightBonus).toBeNull();
    expect(params.effectTextHtml).toBeNull();
    expect(params.orientation.toString()).toBe('portrait');
    expect(params.tags).toEqual([]);
    expect(params.rarity).toBe('uncommon');
    expect(params.cardTypes).toEqual(['spell']);
    expect(params.domains).toEqual(['chaos']);
    expect(params.energyCost).toBe(2);
    expect(params.might).toBeNull();
    expect(params.rulesTextHtml).toBe('<p>Counter a spell.</p>');
    expect(params.imageUrl).toBe('https://cdn.example.com/abandon.png');
    expect(params.imageAlt).toBe('Abandon spell');
    expect(params.illustrators).toEqual(['Kudos Productions']);
    expect(params.raw).toEqual({ id: 'unl-131-219' });
    expect(params.syncedAt).toEqual(now);
  });

  it('populates addendum VOs when present', () => {
    const params = toCardRefreshParams(
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
    expect(params.cardSuperType?.toString()).toBe('champion');
    expect(params.power?.toNumber()).toBe(2);
    expect(params.mightBonus?.toNumber()).toBe(3);
    expect(params.orientation.toString()).toBe('landscape');
    expect(params.effectTextHtml?.toString()).toBe('<p>effect</p>');
    expect(params.tags.map((t) => t.toString())).toEqual(['Mech', 'Piltover']);
  });

  it('produces params that refreshFromSource accepts', () => {
    const baseline = CardAggregate.create({
      id: CardId.create('unl-131-219'),
      setId: SetId.create('UNL'),
      collectorNumber: CollectorNumber.create(131),
      name: CardName.create('Abandon'),
      publicCode: PublicCode.create('UNL-131/219'),
      orientation: Orientation.create('portrait'),
      tags: [],
      raw: {},
      syncedAt: now,
    });
    const params = toCardRefreshParams({ ...baseRecord, name: 'Abandon Reprint' }, now);
    baseline.refreshFromSource(params);
    expect(baseline.name).toBe('Abandon Reprint');
  });
});
