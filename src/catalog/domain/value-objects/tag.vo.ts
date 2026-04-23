export class Tag {
  private constructor(private readonly value: string) {}

  static create(value: string): Tag {
    const normalized = value?.trim();
    if (!normalized) throw new Error('Tag cannot be empty');
    return new Tag(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Tag): boolean {
    return this.value === other.value;
  }
}
