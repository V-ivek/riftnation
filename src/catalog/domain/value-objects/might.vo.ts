export class Might {
  private constructor(private readonly value: number) {}

  static create(value: number): Might {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Might must be an integer >= 0');
    }
    return new Might(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: Might): boolean {
    return this.value === other.value;
  }
}
