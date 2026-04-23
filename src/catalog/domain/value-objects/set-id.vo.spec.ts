import { SetId } from './set-id.vo';

describe('SetId', () => {
  it('uppercases and trims', () => {
    expect(SetId.create('  unl ').toString()).toBe('UNL');
  });

  it('rejects empty and whitespace', () => {
    expect(() => SetId.create('')).toThrow(/SetId/);
    expect(() => SetId.create('   ')).toThrow(/SetId/);
  });

  it('equals is value-based', () => {
    expect(SetId.create('OGN').equals(SetId.create('ogn'))).toBe(true);
    expect(SetId.create('OGN').equals(SetId.create('UNL'))).toBe(false);
  });
});
