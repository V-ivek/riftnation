import { SetAggregate } from '../../../domain/aggregates/set.aggregate';
import { SetId } from '../../../domain/value-objects/set-id.vo';
import { CollectorNumber } from '../../../domain/value-objects/collector-number.vo';
import { SetOrmEntity } from '../entities/set.orm-entity';

export class SetMapper {
  static toDomain(entity: SetOrmEntity): SetAggregate {
    return SetAggregate.create({
      id: SetId.create(entity.id),
      name: entity.name,
      collectorNumberMax: CollectorNumber.create(entity.collectorNumberMax),
      raw: entity.raw,
      syncedAt: entity.syncedAt,
    });
  }

  static toPersistence(agg: SetAggregate): SetOrmEntity {
    const entity = new SetOrmEntity();
    entity.id = agg.id.toString();
    entity.name = agg.name;
    entity.collectorNumberMax = agg.collectorNumberMax;
    entity.raw = agg.raw;
    entity.syncedAt = agg.syncedAt;
    return entity;
  }
}
