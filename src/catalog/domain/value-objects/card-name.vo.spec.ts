import { CardName } from './card-name.vo';

describe('CardName', () => {
  it('trims without changing case', () => {
    expect(CardName.create('  Teemo, Strategist ').toString()).toBe('Teemo, Strategist');
  });

  it('rejects empty and whitespace', () => {
    expect(() => CardName.create('')).toThrow(/CardName/);
    expect(() => CardName.create('   ')).toThrow(/CardName/);
  });

  it('equals is value-based', () => {
    expect(CardName.create('Abandon').equals(CardName.create('Abandon'))).toBe(true);
    expect(CardName.create('Abandon').equals(CardName.create('Blighted Battleaxe'))).toBe(false);
  });
});
