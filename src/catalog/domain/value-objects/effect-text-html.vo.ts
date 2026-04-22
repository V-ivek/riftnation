export class EffectTextHtml {
  private constructor(private readonly value: string) {}

  static create(value: string): EffectTextHtml {
    const normalized = value?.trim();
    if (!normalized) throw new Error('EffectTextHtml cannot be empty');
    return new EffectTextHtml(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: EffectTextHtml): boolean {
    return this.value === other.value;
  }
}
