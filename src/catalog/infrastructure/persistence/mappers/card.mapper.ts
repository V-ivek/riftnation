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
import { CardOrmEntity } from '../entities/card.orm-entity';

export class CardMapper {
  static toDomain(entity: CardOrmEntity): CardAggregate {
    const card = CardAggregate.create({
      id: CardId.create(entity.id),
      setId: SetId.create(entity.setId),
      collectorNumber: CollectorNumber.create(entity.collectorNumber),
      name: CardName.create(entity.name),
      publicCode: PublicCode.create(entity.publicCode),
      rarity: entity.rarity,
      cardTypes: entity.cardTypes ?? [],
      cardSuperType: entity.cardSuperType ? CardSuperType.create(entity.cardSuperType) : null,
      domains: entity.domains ?? [],
      energyCost: entity.energyCost,
      might: entity.might,
      power: entity.power !== null ? Power.create(entity.power) : null,
      mightBonus: entity.mightBonus !== null ? MightBonus.create(entity.mightBonus) : null,
      orientation: Orientation.create(entity.orientation),
      rulesTextHtml: entity.rulesTextHtml,
      effectTextHtml: entity.effectTextHtml ? EffectTextHtml.create(entity.effectTextHtml) : null,
      imageUrl: entity.imageUrl,
      imageAlt: entity.imageAlt,
      illustrators: entity.illustrators ?? [],
      tags: (entity.tags ?? []).map((t) => Tag.create(t)),
      raw: entity.raw,
      syncedAt: entity.syncedAt,
      deletedAt: entity.deletedAt,
    });
    return card;
  }

  static toPersistence(agg: CardAggregate): CardOrmEntity {
    const entity = new CardOrmEntity();
    entity.id = agg.id.toString();
    entity.setId = agg.setId.toString();
    entity.collectorNumber = agg.collectorNumber;
    entity.publicCode = agg.publicCode;
    entity.name = agg.name;
    entity.rarity = agg.rarity ?? '';
    entity.cardTypes = agg.cardTypes;
    entity.cardSuperType = agg.cardSuperType;
    entity.domains = agg.domains;
    entity.energyCost = agg.energyCost;
    entity.might = agg.might;
    entity.power = agg.power;
    entity.mightBonus = agg.mightBonus;
    entity.orientation = agg.orientation;
    entity.rulesTextHtml = agg.rulesTextHtml ?? '';
    entity.effectTextHtml = agg.effectTextHtml;
    entity.imageUrl = agg.imageUrl ?? '';
    entity.imageAlt = agg.imageAlt;
    entity.illustrators = agg.illustrators;
    entity.tags = agg.tags;
    entity.raw = agg.raw;
    entity.deletedAt = agg.deletedAt;
    entity.syncedAt = agg.syncedAt;
    return entity;
  }
}
