import { RulesTextHtml } from './rules-text-html.vo';

describe('RulesTextHtml', () => {
  it('trims without altering markup', () => {
    expect(RulesTextHtml.create('  <p>[Reaction]</p> ').toString()).toBe('<p>[Reaction]</p>');
  });

  it('rejects empty and whitespace', () => {
    expect(() => RulesTextHtml.create('')).toThrow(/RulesTextHtml/);
    expect(() => RulesTextHtml.create('   ')).toThrow(/RulesTextHtml/);
  });

  it('equals is value-based', () => {
    expect(RulesTextHtml.create('<p>a</p>').equals(RulesTextHtml.create('<p>a</p>'))).toBe(true);
    expect(RulesTextHtml.create('<p>a</p>').equals(RulesTextHtml.create('<p>b</p>'))).toBe(false);
  });
});
