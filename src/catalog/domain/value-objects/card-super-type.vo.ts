export class CardSuperType {
  private constructor(private readonly value: string) {}

  static create(value: string): CardSuperType {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) throw new Error('CardSuperType cannot be empty');
    return new CardSuperType(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: CardSuperType): boolean {
    return this.value === other.value;
  }
}
