const ALLOWED = ['body', 'calm', 'chaos', 'colorless', 'fury', 'mind', 'order'] as const;
export type DomainId = typeof ALLOWED[number];

export class Domain {
  private constructor(private readonly value: DomainId) {}

  static create(value: string): Domain {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) throw new Error('Domain cannot be empty');
    if (!ALLOWED.includes(normalized as DomainId)) {
      throw new Error(`Domain must be one of ${ALLOWED.join(', ')}; got "${normalized}"`);
    }
    return new Domain(normalized as DomainId);
  }

  toString(): DomainId {
    return this.value;
  }

  equals(other: Domain): boolean {
    return this.value === other.value;
  }
}
