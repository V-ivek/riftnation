import { IllustratorName } from './illustrator-name.vo';

describe('IllustratorName', () => {
  it('trims without changing case', () => {
    expect(IllustratorName.create('  Kudos Productions ').toString()).toBe('Kudos Productions');
  });

  it('rejects empty and whitespace', () => {
    expect(() => IllustratorName.create('')).toThrow(/IllustratorName/);
    expect(() => IllustratorName.create('   ')).toThrow(/IllustratorName/);
  });

  it('equals is value-based', () => {
    expect(IllustratorName.create('Kudos Productions').equals(IllustratorName.create('Kudos Productions'))).toBe(true);
    expect(IllustratorName.create('Kudos Productions').equals(IllustratorName.create('Other Artist'))).toBe(false);
  });
});
