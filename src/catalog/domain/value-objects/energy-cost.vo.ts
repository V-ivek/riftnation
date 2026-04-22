export class EnergyCost {
  private constructor(private readonly value: number) {}

  static create(value: number): EnergyCost {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('EnergyCost must be an integer >= 0');
    }
    return new EnergyCost(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: EnergyCost): boolean {
    return this.value === other.value;
  }
}
