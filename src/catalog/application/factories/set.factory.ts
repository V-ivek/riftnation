import { Injectable } from '@nestjs/common';
import { SetAggregate } from '../../domain/aggregates/set.aggregate';
import { SetId } from '../../domain/value-objects/set-id.vo';
import { CollectorNumber } from '../../domain/value-objects/collector-number.vo';
import { SetSourceRecord } from '../ports/source-records';

@Injectable()
export class SetFactory {
  fromSource(source: SetSourceRecord, now: Date = new Date()): SetAggregate {
    return SetAggregate.create({
      id: SetId.create(source.id),
      name: source.name,
      collectorNumberMax: CollectorNumber.create(source.collector_number_max),
      raw: source.raw,
      syncedAt: now,
    });
  }
}
