import { Orientation } from './orientation.vo';

describe('Orientation', () => {
  it('accepts portrait and landscape case- and whitespace-insensitively', () => {
    expect(Orientation.create('portrait').toString()).toBe('portrait');
    expect(Orientation.create(' LANDSCAPE ').toString()).toBe('landscape');
  });

  it('rejects unknown ids', () => {
    expect(() => Orientation.create('square')).toThrow(/Orientation/);
  });

  it('rejects empty', () => {
    expect(() => Orientation.create('')).toThrow(/Orientation/);
    expect(() => Orientation.create('   ')).toThrow(/Orientation/);
  });

  it('equals is value-based', () => {
    expect(Orientation.create('portrait').equals(Orientation.create('PORTRAIT'))).toBe(true);
    expect(Orientation.create('portrait').equals(Orientation.create('landscape'))).toBe(false);
  });
});
