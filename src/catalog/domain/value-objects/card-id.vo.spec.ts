import { CardId } from './card-id.vo';

describe('CardId', () => {
  it('trims without changing case', () => {
    expect(CardId.create('  unl-131-219 ').toString()).toBe('unl-131-219');
  });

  it('rejects empty and whitespace', () => {
    expect(() => CardId.create('')).toThrow(/CardId/);
    expect(() => CardId.create('   ')).toThrow(/CardId/);
  });

  it('equals is value-based', () => {
    expect(CardId.create('unl-131-219').equals(CardId.create('unl-131-219'))).toBe(true);
    expect(CardId.create('unl-131-219').equals(CardId.create('ogn-001-298'))).toBe(false);
  });
});
