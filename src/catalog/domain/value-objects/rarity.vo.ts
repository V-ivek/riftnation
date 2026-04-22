const ALLOWED = ['common', 'uncommon', 'rare', 'epic', 'showcase'] as const;
export type RarityId = typeof ALLOWED[number];

export class Rarity {
  private constructor(private readonly value: RarityId) {}

  static create(value: string): Rarity {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) throw new Error('Rarity cannot be empty');
    if (!ALLOWED.includes(normalized as RarityId)) {
      throw new Error(`Rarity must be one of ${ALLOWED.join(', ')}; got "${normalized}"`);
    }
    return new Rarity(normalized as RarityId);
  }

  toString(): RarityId {
    return this.value;
  }

  equals(other: Rarity): boolean {
    return this.value === other.value;
  }
}
