const ALLOWED = ['spell', 'battlefield', 'unit', 'gear', 'legend', 'rune'] as const;
export type CardTypeId = typeof ALLOWED[number];

export class CardType {
  private constructor(private readonly value: CardTypeId) {}

  static create(value: string): CardType {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) throw new Error('CardType cannot be empty');
    if (!ALLOWED.includes(normalized as CardTypeId)) {
      throw new Error(`CardType must be one of ${ALLOWED.join(', ')}; got "${normalized}"`);
    }
    return new CardType(normalized as CardTypeId);
  }

  toString(): CardTypeId {
    return this.value;
  }

  equals(other: CardType): boolean {
    return this.value === other.value;
  }
}
