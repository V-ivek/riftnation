import { CardAggregate } from '../aggregates/card.aggregate';
import { CardId } from '../value-objects/card-id.vo';
import { SetId } from '../value-objects/set-id.vo';

export const CARD_REPOSITORY = Symbol('CARD_REPOSITORY');

export interface CardRepository {
  findById(id: CardId): Promise<CardAggregate | null>;
  existsById(id: CardId): Promise<boolean>;
  findBySetId(setId: SetId, limit?: number, offset?: number): Promise<CardAggregate[]>;
  findIdsBySet(setId: SetId): Promise<CardId[]>;
  save(card: CardAggregate): Promise<void>;
}
