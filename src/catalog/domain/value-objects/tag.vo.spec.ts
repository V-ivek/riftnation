import { Tag } from './tag.vo';

describe('Tag', () => {
  it('trims without changing case', () => {
    expect(Tag.create('  Piltover ').toString()).toBe('Piltover');
  });

  it('rejects empty and whitespace', () => {
    expect(() => Tag.create('')).toThrow(/Tag/);
    expect(() => Tag.create('   ')).toThrow(/Tag/);
  });

  it('equals is value-based', () => {
    expect(Tag.create('Piltover').equals(Tag.create('Piltover'))).toBe(true);
    expect(Tag.create('Piltover').equals(Tag.create('Ionia'))).toBe(false);
  });
});
