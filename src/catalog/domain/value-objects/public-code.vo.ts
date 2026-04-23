export class PublicCode {
  private constructor(private readonly value: string) {}

  static create(value: string): PublicCode {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) throw new Error('PublicCode cannot be empty');
    return new PublicCode(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: PublicCode): boolean {
    return this.value === other.value;
  }
}
