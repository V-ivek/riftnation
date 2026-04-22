export class IllustratorName {
  private constructor(private readonly value: string) {}

  static create(value: string): IllustratorName {
    const normalized = value?.trim();
    if (!normalized) throw new Error('IllustratorName cannot be empty');
    return new IllustratorName(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: IllustratorName): boolean {
    return this.value === other.value;
  }
}
