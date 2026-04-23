import { SetName } from './set-name.vo';

describe('SetName', () => {
  it('trims without changing case', () => {
    expect(SetName.create('  Origins ').toString()).toBe('Origins');
  });

  it('rejects empty and whitespace', () => {
    expect(() => SetName.create('')).toThrow(/SetName/);
    expect(() => SetName.create('   ')).toThrow(/SetName/);
  });

  it('equals is value-based', () => {
    expect(SetName.create('Origins').equals(SetName.create('Origins'))).toBe(true);
    expect(SetName.create('Origins').equals(SetName.create('Unleashed'))).toBe(false);
  });
});
