import { CardId } from '../value-objects/card-id.vo';
import { SetId } from '../value-objects/set-id.vo';
import { CollectorNumber } from '../value-objects/collector-number.vo';
import { CardName } from '../value-objects/card-name.vo';

export interface CardAggregateCreateParams {
  id: CardId;
  setId: SetId;
  collectorNumber: CollectorNumber;
  name: CardName;
  rarity?: string | null;
  cardTypes?: string[];
  domains?: string[];
  energyCost?: number | null;
  might?: number | null;
  rulesTextHtml?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  illustrators?: string[];
  raw: Record<string, unknown>;
  syncedAt: Date;
}

export interface CardAggregateRefreshParams {
  collectorNumber: CollectorNumber;
  name: CardName;
  rarity?: string | null;
  cardTypes?: string[];
  domains?: string[];
  energyCost?: number | null;
  might?: number | null;
  rulesTextHtml?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  illustrators?: string[];
  raw: Record<string, unknown>;
  syncedAt: Date;
}

export class CardAggregate {
  private constructor(
    public readonly id: CardId,
    public readonly setId: SetId,
    private _collectorNumber: CollectorNumber,
    private _name: CardName,
    private _rarity: string | null,
    private _cardTypes: string[],
    private _domains: string[],
    private _energyCost: number | null,
    private _might: number | null,
    private _rulesTextHtml: string | null,
    private _imageUrl: string | null,
    private _imageAlt: string | null,
    private _illustrators: string[],
    private _raw: Record<string, unknown>,
    private _syncedAt: Date,
  ) {}

  static create(params: CardAggregateCreateParams): CardAggregate {
    CardAggregate.validateNumerics(params.energyCost ?? null, params.might ?? null);

    return new CardAggregate(
      params.id,
      params.setId,
      params.collectorNumber,
      params.name,
      params.rarity ?? null,
      CardAggregate.normalizeUniqueStrings(params.cardTypes ?? []),
      CardAggregate.normalizeUniqueStrings(params.domains ?? []),
      params.energyCost ?? null,
      params.might ?? null,
      params.rulesTextHtml ?? null,
      params.imageUrl ?? null,
      params.imageAlt ?? null,
      CardAggregate.normalizeUniqueStrings(params.illustrators ?? []),
      params.raw,
      params.syncedAt,
    );
  }

  refreshFromSource(params: CardAggregateRefreshParams): void {
    CardAggregate.validateNumerics(params.energyCost ?? null, params.might ?? null);

    this._collectorNumber = params.collectorNumber;
    this._name = params.name;
    this._rarity = params.rarity ?? null;
    this._cardTypes = CardAggregate.normalizeUniqueStrings(params.cardTypes ?? []);
    this._domains = CardAggregate.normalizeUniqueStrings(params.domains ?? []);
    this._energyCost = params.energyCost ?? null;
    this._might = params.might ?? null;
    this._rulesTextHtml = params.rulesTextHtml ?? null;
    this._imageUrl = params.imageUrl ?? null;
    this._imageAlt = params.imageAlt ?? null;
    this._illustrators = CardAggregate.normalizeUniqueStrings(params.illustrators ?? []);
    this._raw = params.raw;
    this._syncedAt = params.syncedAt;
  }

  hasType(type: string): boolean {
    return this._cardTypes.includes(type.trim().toLowerCase());
  }

  hasDomain(domain: string): boolean {
    return this._domains.includes(domain.trim().toLowerCase());
  }

  belongsToSet(setId: SetId): boolean {
    return this.setId.equals(setId);
  }

  get collectorNumber(): number {
    return this._collectorNumber.toNumber();
  }

  get name(): string {
    return this._name.toString();
  }

  get rarity(): string | null {
    return this._rarity;
  }

  get cardTypes(): string[] {
    return [...this._cardTypes];
  }

  get domains(): string[] {
    return [...this._domains];
  }

  get energyCost(): number | null {
    return this._energyCost;
  }

  get might(): number | null {
    return this._might;
  }

  get rulesTextHtml(): string | null {
    return this._rulesTextHtml;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get imageAlt(): string | null {
    return this._imageAlt;
  }

  get illustrators(): string[] {
    return [...this._illustrators];
  }

  get raw(): Record<string, unknown> {
    return this._raw;
  }

  get syncedAt(): Date {
    return this._syncedAt;
  }

  private static validateNumerics(energyCost: number | null, might: number | null): void {
    if (energyCost !== null && energyCost < 0) throw new Error('Energy cost must be >= 0');
    if (might !== null && might < 0) throw new Error('Might must be >= 0');
  }

  private static normalizeUniqueStrings(values: string[]): string[] {
    return [
      ...new Set(
        values
          .map((v) => v.trim())
          .filter(Boolean)
          .map((v) => v.toLowerCase()),
      ),
    ];
  }
}
