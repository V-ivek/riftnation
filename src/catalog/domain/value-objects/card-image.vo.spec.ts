import { CardImage } from './card-image.vo';

describe('CardImage', () => {
  it('accepts a valid https url with alt text', () => {
    const img = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: 'Abandon card' });
    expect(img.url).toBe('https://cdn.example.com/x.png');
    expect(img.alt).toBe('Abandon card');
  });

  it('accepts a valid https url with null alt', () => {
    const img = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: null });
    expect(img.alt).toBeNull();
  });

  it('accepts a valid https url with no alt key at all', () => {
    const img = CardImage.create({ url: 'https://cdn.example.com/x.png' });
    expect(img.alt).toBeNull();
  });

  it('collapses whitespace-only alt to null', () => {
    const img = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: '   ' });
    expect(img.alt).toBeNull();
  });

  it('trims alt when present', () => {
    const img = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: '  alt text ' });
    expect(img.alt).toBe('alt text');
  });

  it('rejects blank url', () => {
    expect(() => CardImage.create({ url: '' })).toThrow(/CardImage/);
    expect(() => CardImage.create({ url: '   ' })).toThrow(/CardImage/);
  });

  it('rejects http:// url', () => {
    expect(() => CardImage.create({ url: 'http://cdn.example.com/x.png' })).toThrow(/CardImage/);
  });

  it('equals compares url and alt', () => {
    const a = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: 'foo' });
    const b = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: 'foo' });
    const c = CardImage.create({ url: 'https://cdn.example.com/y.png', alt: 'foo' });
    const d = CardImage.create({ url: 'https://cdn.example.com/x.png', alt: 'bar' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(d)).toBe(false);
  });
});
