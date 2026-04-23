export class CollectorNumber {
  private constructor(private readonly value: number) {}

  static create(value: number): CollectorNumber {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('CollectorNumber must be an integer >= 1');
    }
    return new CollectorNumber(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: CollectorNumber): boolean {
    return this.value === other.value;
  }
}
