import { Power } from './power.vo';

describe('Power', () => {
  it('accepts zero and positive integers', () => {
    expect(Power.create(0).toNumber()).toBe(0);
    expect(Power.create(4).toNumber()).toBe(4);
  });

  it('rejects negatives', () => {
    expect(() => Power.create(-1)).toThrow(/Power/);
  });

  it('rejects non-integers', () => {
    expect(() => Power.create(1.5)).toThrow(/Power/);
    expect(() => Power.create(NaN)).toThrow(/Power/);
  });

  it('equals is value-based', () => {
    expect(Power.create(2).equals(Power.create(2))).toBe(true);
    expect(Power.create(2).equals(Power.create(3))).toBe(false);
  });
});
