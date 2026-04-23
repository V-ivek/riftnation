export class Power {
  private constructor(private readonly value: number) {}

  static create(value: number): Power {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Power must be an integer >= 0');
    }
    return new Power(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: Power): boolean {
    return this.value === other.value;
  }
}
