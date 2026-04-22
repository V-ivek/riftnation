import { MightBonus } from './might-bonus.vo';

describe('MightBonus', () => {
  it('accepts zero and positive integers', () => {
    expect(MightBonus.create(0).toNumber()).toBe(0);
    expect(MightBonus.create(3).toNumber()).toBe(3);
  });

  it('rejects negatives', () => {
    expect(() => MightBonus.create(-1)).toThrow(/MightBonus/);
  });

  it('rejects non-integers', () => {
    expect(() => MightBonus.create(1.5)).toThrow(/MightBonus/);
    expect(() => MightBonus.create(NaN)).toThrow(/MightBonus/);
  });

  it('equals is value-based', () => {
    expect(MightBonus.create(3).equals(MightBonus.create(3))).toBe(true);
    expect(MightBonus.create(3).equals(MightBonus.create(4))).toBe(false);
  });
});
