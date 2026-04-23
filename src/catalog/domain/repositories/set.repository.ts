import { SetAggregate } from '../aggregates/set.aggregate';
import { SetId } from '../value-objects/set-id.vo';

export const SET_REPOSITORY = Symbol('SET_REPOSITORY');

export interface SetRepository {
  findById(id: SetId): Promise<SetAggregate | null>;
  existsById(id: SetId): Promise<boolean>;
  save(set: SetAggregate): Promise<void>;
}
