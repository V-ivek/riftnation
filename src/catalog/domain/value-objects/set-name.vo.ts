export class SetName {
  private constructor(private readonly value: string) {}

  static create(value: string): SetName {
    const normalized = value?.trim();
    if (!normalized) throw new Error('SetName cannot be empty');
    return new SetName(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SetName): boolean {
    return this.value === other.value;
  }
}
