export class CardName {
  private constructor(private readonly value: string) {}

  static create(value: string): CardName {
    const normalized = value?.trim();
    if (!normalized) throw new Error('CardName cannot be empty');
    return new CardName(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CardName): boolean {
    return this.value === other.value;
  }
}
