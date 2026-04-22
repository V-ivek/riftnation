export class RulesTextHtml {
  private constructor(private readonly value: string) {}

  static create(value: string): RulesTextHtml {
    const normalized = value?.trim();
    if (!normalized) throw new Error('RulesTextHtml cannot be empty');
    return new RulesTextHtml(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: RulesTextHtml): boolean {
    return this.value === other.value;
  }
}
