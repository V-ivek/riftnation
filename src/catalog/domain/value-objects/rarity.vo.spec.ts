import { Rarity } from './rarity.vo';

describe('Rarity', () => {
  it('accepts all known ids case- and whitespace-insensitively', () => {
    for (const id of ['common', 'uncommon', 'rare', 'epic', 'showcase']) {
      expect(Rarity.create(` ${id.toUpperCase()} `).toString()).toBe(id);
    }
  });

  it('rejects unknown ids', () => {
    expect(() => Rarity.create('legendary')).toThrow(/Rarity/);
  });

  it('rejects empty', () => {
    expect(() => Rarity.create('')).toThrow(/Rarity/);
    expect(() => Rarity.create('   ')).toThrow(/Rarity/);
  });

  it('equals is value-based', () => {
    expect(Rarity.create('epic').equals(Rarity.create('EPIC'))).toBe(true);
    expect(Rarity.create('epic').equals(Rarity.create('rare'))).toBe(false);
  });
});
