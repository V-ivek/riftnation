import { SetFactory } from './set.factory';
import { SetSourceRecord } from '../ports/source-records';

describe('SetFactory.fromSource', () => {
  const now = new Date('2026-04-18T00:00:00Z');
  const record: SetSourceRecord = {
    id: 'UNL',
    name: 'Unleashed',
    collector_number_max: 219,
    raw: { id: 'UNL', name: 'Unleashed', collectorNumberMax: 219 },
  };

  it('builds a SetAggregate with normalized VOs', () => {
    const factory = new SetFactory();
    const set = factory.fromSource(record, now);
    expect(set.id.toString()).toBe('UNL');
    expect(set.name).toBe('Unleashed');
    expect(set.collectorNumberMax).toBe(219);
    expect(set.raw).toEqual(record.raw);
    expect(set.syncedAt).toEqual(now);
  });

  it('uppercases a lowercase set id at the VO boundary', () => {
    const factory = new SetFactory();
    const set = factory.fromSource({ ...record, id: 'unl' }, now);
    expect(set.id.toString()).toBe('UNL');
  });

  it('rejects a zero collector_number_max via CollectorNumber invariant', () => {
    const factory = new SetFactory();
    expect(() => factory.fromSource({ ...record, collector_number_max: 0 }, now)).toThrow(/CollectorNumber/);
  });
});
