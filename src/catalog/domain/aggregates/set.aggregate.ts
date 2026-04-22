import { SetId } from '../value-objects/set-id.vo';
import { CollectorNumber } from '../value-objects/collector-number.vo';

export interface SetAggregateCreateParams {
  id: SetId;
  name: string;
  collectorNumberMax: CollectorNumber;
  raw: Record<string, unknown>;
  syncedAt: Date;
}

export interface SetAggregateRefreshParams {
  name: string;
  collectorNumberMax: CollectorNumber;
  raw: Record<string, unknown>;
  syncedAt: Date;
}

export class SetAggregate {
  private constructor(
    public readonly id: SetId,
    private _name: string,
    private _collectorNumberMax: CollectorNumber,
    private _raw: Record<string, unknown>,
    private _syncedAt: Date,
  ) {}

  static create(params: SetAggregateCreateParams): SetAggregate {
    const name = params.name?.trim();
    if (!name) throw new Error('SetAggregate name cannot be empty');
    return new SetAggregate(
      params.id,
      name,
      params.collectorNumberMax,
      params.raw,
      params.syncedAt,
    );
  }

  refreshFromSource(params: SetAggregateRefreshParams): void {
    const name = params.name?.trim();
    if (!name) throw new Error('SetAggregate name cannot be empty');
    this._name = name;
    this._collectorNumberMax = params.collectorNumberMax;
    this._raw = params.raw;
    this._syncedAt = params.syncedAt;
  }

  get name(): string {
    return this._name;
  }

  get collectorNumberMax(): number {
    return this._collectorNumberMax.toNumber();
  }

  get raw(): Record<string, unknown> {
    return this._raw;
  }

  get syncedAt(): Date {
    return this._syncedAt;
  }
}
