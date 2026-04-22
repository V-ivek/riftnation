export class SetId {
  private constructor(private readonly value: string) {}

  static create(value: string): SetId {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) throw new Error('SetId cannot be empty');
    return new SetId(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SetId): boolean {
    return this.value === other.value;
  }
}
