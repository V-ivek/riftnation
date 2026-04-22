import { SetAggregate } from './set.aggregate';
import { SetId } from '../value-objects/set-id.vo';
import { CollectorNumber } from '../value-objects/collector-number.vo';

describe('SetAggregate', () => {
  const now = new Date('2026-04-18T00:00:00Z');
  const baseline = () => ({
    id: SetId.create('UNL'),
    name: 'Unleashed',
    collectorNumberMax: CollectorNumber.create(219),
    raw: { id: 'UNL', name: 'Unleashed', collectorNumberMax: 219 } as Record<string, unknown>,
    syncedAt: now,
  });

  it('creates with valid params and exposes normalized getters', () => {
    const set = SetAggregate.create(baseline());
    expect(set.id.toString()).toBe('UNL');
    expect(set.name).toBe('Unleashed');
    expect(set.collectorNumberMax).toBe(219);
    expect(set.raw).toEqual({ id: 'UNL', name: 'Unleashed', collectorNumberMax: 219 });
    expect(set.syncedAt).toEqual(now);
  });

  it('trims the name', () => {
    const set = SetAggregate.create({ ...baseline(), name: '  Unleashed  ' });
    expect(set.name).toBe('Unleashed');
  });

  it('rejects blank name on create', () => {
    expect(() => SetAggregate.create({ ...baseline(), name: '' })).toThrow(/name/);
    expect(() => SetAggregate.create({ ...baseline(), name: '   ' })).toThrow(/name/);
  });

  it('refreshFromSource mutates state', () => {
    const set = SetAggregate.create(baseline());
    const later = new Date('2026-04-19T00:00:00Z');
    set.refreshFromSource({
      name: 'Unleashed Deluxe',
      collectorNumberMax: CollectorNumber.create(220),
      raw: { id: 'UNL', name: 'Unleashed Deluxe', collectorNumberMax: 220 },
      syncedAt: later,
    });
    expect(set.name).toBe('Unleashed Deluxe');
    expect(set.collectorNumberMax).toBe(220);
    expect(set.syncedAt).toEqual(later);
  });

  it('refreshFromSource rejects blank name', () => {
    const set = SetAggregate.create(baseline());
    expect(() =>
      set.refreshFromSource({
        name: '',
        collectorNumberMax: CollectorNumber.create(219),
        raw: {},
        syncedAt: now,
      }),
    ).toThrow(/name/);
  });
});
