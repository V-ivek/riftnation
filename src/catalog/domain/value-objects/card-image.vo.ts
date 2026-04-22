export class CardImage {
  private constructor(
    private readonly _url: string,
    private readonly _alt: string | null,
  ) {}

  static create(params: { url: string; alt?: string | null }): CardImage {
    const url = params.url?.trim();
    if (!url) throw new Error('CardImage url cannot be empty');
    if (!url.startsWith('https://')) {
      throw new Error('CardImage url must use https://');
    }

    const rawAlt = params.alt ?? null;
    const trimmedAlt = typeof rawAlt === 'string' ? rawAlt.trim() : null;
    const alt = trimmedAlt ? trimmedAlt : null;

    return new CardImage(url, alt);
  }

  get url(): string {
    return this._url;
  }

  get alt(): string | null {
    return this._alt;
  }

  equals(other: CardImage): boolean {
    return this._url === other._url && this._alt === other._alt;
  }
}
