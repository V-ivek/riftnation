import { CardId } from '../value-objects/card-id.vo';
import { SetId } from '../value-objects/set-id.vo';
import { CollectorNumber } from '../value-objects/collector-number.vo';
import { CardName } from '../value-objects/card-name.vo';
import { PublicCode } from '../value-objects/public-code.vo';
import { CardSuperType } from '../value-objects/card-super-type.vo';
import { Power } from '../value-objects/power.vo';
import { MightBonus } from '../value-objects/might-bonus.vo';
import { Orientation } from '../value-objects/orientation.vo';
import { EffectTextHtml } from '../value-objects/effect-text-html.vo';
import { Tag } from '../value-objects/tag.vo';

export interface CardAggregateCreateParams {
  id: CardId;
  setId: SetId;
  collectorNumber: CollectorNumber;
  name: CardName;
  publicCode: PublicCode;
  rarity?: string | null;
  cardTypes?: string[];
  cardSuperType?: CardSuperType | null;
  domains?: string[];
  energyCost?: number | null;
  might?: number | null;
  power?: Power | null;
  mightBonus?: MightBonus | null;
  orientation: Orientation;
  rulesTextHtml?: string | null;
  effectTextHtml?: EffectTextHtml | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  illustrators?: string[];
  tags: Tag[];
  raw: Record<string, unknown>;
  syncedAt: Date;
  deletedAt?: Date | null;
}

export interface CardAggregateRefreshParams {
  collectorNumber: CollectorNumber;
  name: CardName;
  publicCode: PublicCode;
  rarity?: string | null;
  cardTypes?: string[];
  cardSuperType?: CardSuperType | null;
  domains?: string[];
  energyCost?: number | null;
  might?: number | null;
  power?: Power | null;
  mightBonus?: MightBonus | null;
  orientation: Orientation;
  rulesTextHtml?: string | null;
  effectTextHtml?: EffectTextHtml | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  illustrators?: string[];
  tags: Tag[];
  raw: Record<string, unknown>;
  syncedAt: Date;
}

export class CardAggregate {
  private constructor(
    public readonly id: CardId,
    public readonly setId: SetId,
    private _collectorNumber: CollectorNumber,
    private _name: CardName,
    private _publicCode: PublicCode,
    private _rarity: string | null,
    private _cardTypes: string[],
    private _cardSuperType: CardSuperType | null,
    private _domains: string[],
    private _energyCost: number | null,
    private _might: number | null,
    private _power: Power | null,
    private _mightBonus: MightBonus | null,
    private _orientation: Orientation,
    private _rulesTextHtml: string | null,
    private _effectTextHtml: EffectTextHtml | null,
    private _imageUrl: string | null,
    private _imageAlt: string | null,
    private _illustrators: string[],
    private _tags: string[],
    private _raw: Record<string, unknown>,
    private _syncedAt: Date,
    private _deletedAt: Date | null,
  ) {}

  static create(params: CardAggregateCreateParams): CardAggregate {
    CardAggregate.validateNumerics(params.energyCost ?? null, params.might ?? null);
    const deletedAt = params.deletedAt ?? null;
    CardAggregate.validateDeletedAt(deletedAt);

    return new CardAggregate(
      params.id,
      params.setId,
      params.collectorNumber,
      params.name,
      params.publicCode,
      params.rarity ?? null,
      CardAggregate.normalizeUniqueStrings(params.cardTypes ?? []),
      params.cardSuperType ?? null,
      CardAggregate.normalizeUniqueStrings(params.domains ?? []),
      params.energyCost ?? null,
      params.might ?? null,
      params.power ?? null,
      params.mightBonus ?? null,
      params.orientation,
      params.rulesTextHtml ?? null,
      params.effectTextHtml ?? null,
      params.imageUrl ?? null,
      params.imageAlt ?? null,
      CardAggregate.normalizeUniqueStrings(params.illustrators ?? []),
      CardAggregate.normalizeUniqueStrings((params.tags ?? []).map((t) => t.toString())),
      params.raw,
      params.syncedAt,
      deletedAt,
    );
  }

  refreshFromSource(params: CardAggregateRefreshParams): void {
    CardAggregate.validateNumerics(params.energyCost ?? null, params.might ?? null);

    this._collectorNumber = params.collectorNumber;
    this._name = params.name;
    this._publicCode = params.publicCode;
    this._rarity = params.rarity ?? null;
    this._cardTypes = CardAggregate.normalizeUniqueStrings(params.cardTypes ?? []);
    this._cardSuperType = params.cardSuperType ?? null;
    this._domains = CardAggregate.normalizeUniqueStrings(params.domains ?? []);
    this._energyCost = params.energyCost ?? null;
    this._might = params.might ?? null;
    this._power = params.power ?? null;
    this._mightBonus = params.mightBonus ?? null;
    this._orientation = params.orientation;
    this._rulesTextHtml = params.rulesTextHtml ?? null;
    this._effectTextHtml = params.effectTextHtml ?? null;
    this._imageUrl = params.imageUrl ?? null;
    this._imageAlt = params.imageAlt ?? null;
    this._illustrators = CardAggregate.normalizeUniqueStrings(params.illustrators ?? []);
    this._tags = CardAggregate.normalizeUniqueStrings((params.tags ?? []).map((t) => t.toString()));
    this._raw = params.raw;
    this._syncedAt = params.syncedAt;
  }

  markDeleted(at: Date): void {
    CardAggregate.validateDeletedAt(at);
    this._deletedAt = at;
  }

  restore(): void {
    this._deletedAt = null;
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

  get publicCode(): string {
    return this._publicCode.toString();
  }

  get rarity(): string | null {
    return this._rarity;
  }

  get cardTypes(): string[] {
    return [...this._cardTypes];
  }

  get cardSuperType(): string | null {
    return this._cardSuperType ? this._cardSuperType.toString() : null;
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

  get power(): number | null {
    return this._power ? this._power.toNumber() : null;
  }

  get mightBonus(): number | null {
    return this._mightBonus ? this._mightBonus.toNumber() : null;
  }

  get orientation(): string {
    return this._orientation.toString();
  }

  get rulesTextHtml(): string | null {
    return this._rulesTextHtml;
  }

  get effectTextHtml(): string | null {
    return this._effectTextHtml ? this._effectTextHtml.toString() : null;
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

  get tags(): string[] {
    return [...this._tags];
  }

  get raw(): Record<string, unknown> {
    return this._raw;
  }

  get syncedAt(): Date {
    return this._syncedAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  private static validateNumerics(energyCost: number | null, might: number | null): void {
    if (energyCost !== null && energyCost < 0) throw new Error('Energy cost must be >= 0');
    if (might !== null && might < 0) throw new Error('Might must be >= 0');
  }

  private static validateDeletedAt(deletedAt: Date | null): void {
    if (deletedAt && deletedAt.getTime() > Date.now()) {
      throw new Error('deletedAt must not be in the future');
    }
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
