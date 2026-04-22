export class MightBonus {
  private constructor(private readonly value: number) {}

  static create(value: number): MightBonus {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('MightBonus must be an integer >= 0');
    }
    return new MightBonus(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: MightBonus): boolean {
    return this.value === other.value;
  }
}
