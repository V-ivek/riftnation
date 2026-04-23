import { Might } from './might.vo';

describe('Might', () => {
  it('accepts zero and positive integers', () => {
    expect(Might.create(0).toNumber()).toBe(0);
    expect(Might.create(5).toNumber()).toBe(5);
  });

  it('rejects negatives', () => {
    expect(() => Might.create(-1)).toThrow(/Might/);
  });

  it('rejects non-integers', () => {
    expect(() => Might.create(1.5)).toThrow(/Might/);
    expect(() => Might.create(NaN)).toThrow(/Might/);
  });

  it('equals is value-based', () => {
    expect(Might.create(3).equals(Might.create(3))).toBe(true);
    expect(Might.create(3).equals(Might.create(4))).toBe(false);
  });
});
