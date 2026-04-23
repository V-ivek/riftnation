import { CollectorNumber } from './collector-number.vo';

describe('CollectorNumber', () => {
  it('accepts positive integers', () => {
    expect(CollectorNumber.create(1).toNumber()).toBe(1);
    expect(CollectorNumber.create(298).toNumber()).toBe(298);
  });

  it('rejects zero and negatives', () => {
    expect(() => CollectorNumber.create(0)).toThrow(/CollectorNumber/);
    expect(() => CollectorNumber.create(-1)).toThrow(/CollectorNumber/);
  });

  it('rejects non-integers', () => {
    expect(() => CollectorNumber.create(1.5)).toThrow(/CollectorNumber/);
    expect(() => CollectorNumber.create(NaN)).toThrow(/CollectorNumber/);
  });

  it('equals is value-based', () => {
    expect(CollectorNumber.create(131).equals(CollectorNumber.create(131))).toBe(true);
    expect(CollectorNumber.create(131).equals(CollectorNumber.create(132))).toBe(false);
  });
});
