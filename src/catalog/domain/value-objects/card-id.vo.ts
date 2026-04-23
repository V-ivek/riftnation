export class CardId {
  private constructor(private readonly value: string) {}

  static create(value: string): CardId {
    const normalized = value?.trim();
    if (!normalized) throw new Error('CardId cannot be empty');
    return new CardId(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CardId): boolean {
    return this.value === other.value;
  }
}
