import { Injectable } from '@nestjs/common';
import { CardAggregate } from '../../domain/aggregates/card.aggregate';
import { CardId } from '../../domain/value-objects/card-id.vo';
import { SetId } from '../../domain/value-objects/set-id.vo';
import { CollectorNumber } from '../../domain/value-objects/collector-number.vo';
import { CardName } from '../../domain/value-objects/card-name.vo';
import { PublicCode } from '../../domain/value-objects/public-code.vo';
import { CardSuperType } from '../../domain/value-objects/card-super-type.vo';
import { Power } from '../../domain/value-objects/power.vo';
import { MightBonus } from '../../domain/value-objects/might-bonus.vo';
import { Orientation } from '../../domain/value-objects/orientation.vo';
import { EffectTextHtml } from '../../domain/value-objects/effect-text-html.vo';
import { Tag } from '../../domain/value-objects/tag.vo';
import { CardSourceRecord } from '../ports/source-records';

@Injectable()
export class CardFactory {
  fromSource(source: CardSourceRecord, now: Date = new Date()): CardAggregate {
    return CardAggregate.create({
      id: CardId.create(source.id),
      setId: SetId.create(source.set_id),
      collectorNumber: CollectorNumber.create(source.collector_number),
      name: CardName.create(source.name),
      publicCode: PublicCode.create(source.public_code),
      rarity: source.rarity,
      cardTypes: source.card_types,
      cardSuperType: source.card_super_type ? CardSuperType.create(source.card_super_type) : null,
      domains: source.domains,
      energyCost: source.energy_cost,
      might: source.might,
      power: source.power !== null ? Power.create(source.power) : null,
      mightBonus: source.might_bonus !== null ? MightBonus.create(source.might_bonus) : null,
      orientation: Orientation.create(source.orientation),
      rulesTextHtml: source.rules_text_html,
      effectTextHtml: source.effect_text_html ? EffectTextHtml.create(source.effect_text_html) : null,
      imageUrl: source.image_url,
      imageAlt: source.image_alt,
      illustrators: source.illustrators,
      tags: source.tags.map((t) => Tag.create(t)),
      raw: source.raw,
      syncedAt: now,
    });
  }
}
