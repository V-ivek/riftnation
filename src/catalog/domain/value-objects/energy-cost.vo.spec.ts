import { EnergyCost } from './energy-cost.vo';

describe('EnergyCost', () => {
  it('accepts zero and positive integers', () => {
    expect(EnergyCost.create(0).toNumber()).toBe(0);
    expect(EnergyCost.create(7).toNumber()).toBe(7);
  });

  it('rejects negatives', () => {
    expect(() => EnergyCost.create(-1)).toThrow(/EnergyCost/);
  });

  it('rejects non-integers', () => {
    expect(() => EnergyCost.create(1.5)).toThrow(/EnergyCost/);
    expect(() => EnergyCost.create(NaN)).toThrow(/EnergyCost/);
  });

  it('equals is value-based', () => {
    expect(EnergyCost.create(2).equals(EnergyCost.create(2))).toBe(true);
    expect(EnergyCost.create(2).equals(EnergyCost.create(3))).toBe(false);
  });
});
