import { CardSuperType } from './card-super-type.vo';

describe('CardSuperType', () => {
  it('trims and lowercases', () => {
    expect(CardSuperType.create('  Champion ').toString()).toBe('champion');
  });

  it('rejects empty and whitespace', () => {
    expect(() => CardSuperType.create('')).toThrow(/CardSuperType/);
    expect(() => CardSuperType.create('   ')).toThrow(/CardSuperType/);
  });

  it('equals is value-based', () => {
    expect(CardSuperType.create('champion').equals(CardSuperType.create('CHAMPION'))).toBe(true);
    expect(CardSuperType.create('champion').equals(CardSuperType.create('signature'))).toBe(false);
  });
});
