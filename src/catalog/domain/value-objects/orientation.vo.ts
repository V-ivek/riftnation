const ALLOWED = ['portrait', 'landscape'] as const;
export type OrientationId = typeof ALLOWED[number];

export class Orientation {
  private constructor(private readonly value: OrientationId) {}

  static create(value: string): Orientation {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) throw new Error('Orientation cannot be empty');
    if (!ALLOWED.includes(normalized as OrientationId)) {
      throw new Error(`Orientation must be one of ${ALLOWED.join(', ')}; got "${normalized}"`);
    }
    return new Orientation(normalized as OrientationId);
  }

  toString(): OrientationId {
    return this.value;
  }

  equals(other: Orientation): boolean {
    return this.value === other.value;
  }
}
