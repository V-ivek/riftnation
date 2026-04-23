import { PublicCode } from './public-code.vo';

describe('PublicCode', () => {
  it('trims and uppercases while preserving slashes and digits', () => {
    expect(PublicCode.create('  unl-131/219 ').toString()).toBe('UNL-131/219');
  });

  it('rejects empty and whitespace', () => {
    expect(() => PublicCode.create('')).toThrow(/PublicCode/);
    expect(() => PublicCode.create('   ')).toThrow(/PublicCode/);
  });

  it('equals is value-based', () => {
    expect(PublicCode.create('UNL-131/219').equals(PublicCode.create('unl-131/219'))).toBe(true);
    expect(PublicCode.create('UNL-131/219').equals(PublicCode.create('OGN-001/298'))).toBe(false);
  });
});
