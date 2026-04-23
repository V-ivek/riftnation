import { EffectTextHtml } from './effect-text-html.vo';

describe('EffectTextHtml', () => {
  it('trims without altering markup', () => {
    expect(EffectTextHtml.create('  <p>hello</p> ').toString()).toBe('<p>hello</p>');
  });

  it('rejects empty and whitespace', () => {
    expect(() => EffectTextHtml.create('')).toThrow(/EffectTextHtml/);
    expect(() => EffectTextHtml.create('   ')).toThrow(/EffectTextHtml/);
  });

  it('equals is value-based', () => {
    expect(EffectTextHtml.create('<p>a</p>').equals(EffectTextHtml.create('<p>a</p>'))).toBe(true);
    expect(EffectTextHtml.create('<p>a</p>').equals(EffectTextHtml.create('<p>b</p>'))).toBe(false);
  });
});
