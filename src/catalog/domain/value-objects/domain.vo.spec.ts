import { Domain } from './domain.vo';

describe('Domain', () => {
  it('accepts all seven known ids case- and whitespace-insensitively', () => {
    for (const id of ['body', 'calm', 'chaos', 'colorless', 'fury', 'mind', 'order']) {
      expect(Domain.create(` ${id.toUpperCase()} `).toString()).toBe(id);
    }
  });

  it('rejects unknown ids', () => {
    expect(() => Domain.create('void')).toThrow(/Domain/);
  });

  it('rejects empty', () => {
    expect(() => Domain.create('')).toThrow(/Domain/);
    expect(() => Domain.create('   ')).toThrow(/Domain/);
  });

  it('equals is value-based', () => {
    expect(Domain.create('chaos').equals(Domain.create('CHAOS'))).toBe(true);
    expect(Domain.create('chaos').equals(Domain.create('order'))).toBe(false);
  });
});
