import { SetMapper } from './set.mapper';
import { SetAggregate } from '../../../domain/aggregates/set.aggregate';
import { SetId } from '../../../domain/value-objects/set-id.vo';
import { CollectorNumber } from '../../../domain/value-objects/collector-number.vo';

describe('SetMapper', () => {
  const now = new Date('2026-04-18T00:00:00Z');

  const aggregate = () =>
    SetAggregate.create({
      id: SetId.create('UNL'),
      name: 'Unleashed',
      collectorNumberMax: CollectorNumber.create(219),
      raw: { id: 'UNL', name: 'Unleashed' },
      syncedAt: now,
    });

  it('round-trips a SetAggregate through the ORM entity', () => {
    const original = aggregate();
    const entity = SetMapper.toPersistence(original);
    expect(entity.id).toBe('UNL');
    expect(entity.name).toBe('Unleashed');
    expect(entity.collectorNumberMax).toBe(219);
    expect(entity.raw).toEqual({ id: 'UNL', name: 'Unleashed' });
    expect(entity.syncedAt).toEqual(now);

    const rebuilt = SetMapper.toDomain(entity);
    expect(rebuilt.id.toString()).toBe('UNL');
    expect(rebuilt.name).toBe('Unleashed');
    expect(rebuilt.collectorNumberMax).toBe(219);
    expect(rebuilt.raw).toEqual({ id: 'UNL', name: 'Unleashed' });
    expect(rebuilt.syncedAt).toEqual(now);
  });
});
