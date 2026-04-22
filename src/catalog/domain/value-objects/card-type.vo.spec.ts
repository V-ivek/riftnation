import { CardType } from './card-type.vo';

describe('CardType', () => {
  it('accepts all known ids case- and whitespace-insensitively', () => {
    for (const id of ['spell', 'battlefield', 'unit', 'gear', 'legend', 'rune']) {
      expect(CardType.create(` ${id.toUpperCase()} `).toString()).toBe(id);
    }
  });

  it('rejects unknown ids', () => {
    expect(() => CardType.create('enchantment')).toThrow(/CardType/);
  });

  it('rejects empty', () => {
    expect(() => CardType.create('')).toThrow(/CardType/);
    expect(() => CardType.create('   ')).toThrow(/CardType/);
  });

  it('equals is value-based', () => {
    expect(CardType.create('spell').equals(CardType.create('SPELL'))).toBe(true);
    expect(CardType.create('spell').equals(CardType.create('unit'))).toBe(false);
  });
});
