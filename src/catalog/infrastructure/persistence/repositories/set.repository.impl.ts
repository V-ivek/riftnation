import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SetRepository } from '../../../domain/repositories/set.repository';
import { SetAggregate } from '../../../domain/aggregates/set.aggregate';
import { SetId } from '../../../domain/value-objects/set-id.vo';
import { SetOrmEntity } from '../entities/set.orm-entity';
import { SetMapper } from '../mappers/set.mapper';

@Injectable()
export class SetRepositoryImpl implements SetRepository {
  constructor(
    @InjectRepository(SetOrmEntity)
    private readonly repository: Repository<SetOrmEntity>,
  ) {}

  async findById(id: SetId): Promise<SetAggregate | null> {
    const entity = await this.repository.findOne({ where: { id: id.toString() } });
    return entity ? SetMapper.toDomain(entity) : null;
  }

  async existsById(id: SetId): Promise<boolean> {
    return this.repository.exist({ where: { id: id.toString() } });
  }

  async save(set: SetAggregate): Promise<void> {
    await this.repository.save(SetMapper.toPersistence(set));
  }
}
