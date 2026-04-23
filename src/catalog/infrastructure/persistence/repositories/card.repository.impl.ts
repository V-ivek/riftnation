import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CardRepository } from '../../../domain/repositories/card.repository';
import { CardAggregate } from '../../../domain/aggregates/card.aggregate';
import { CardId } from '../../../domain/value-objects/card-id.vo';
import { SetId } from '../../../domain/value-objects/set-id.vo';
import { CardOrmEntity } from '../entities/card.orm-entity';
import { CardMapper } from '../mappers/card.mapper';

@Injectable()
export class CardRepositoryImpl implements CardRepository {
  constructor(
    @InjectRepository(CardOrmEntity)
    private readonly repository: Repository<CardOrmEntity>,
  ) {}

  async findById(id: CardId): Promise<CardAggregate | null> {
    const entity = await this.repository.findOne({ where: { id: id.toString() } });
    return entity ? CardMapper.toDomain(entity) : null;
  }

  async existsById(id: CardId): Promise<boolean> {
    return this.repository.exist({ where: { id: id.toString() } });
  }

  async findBySetId(setId: SetId, limit = 50, offset = 0): Promise<CardAggregate[]> {
    const entities = await this.repository.find({
      where: { setId: setId.toString() },
      take: limit,
      skip: offset,
      order: { collectorNumber: 'ASC' },
    });
    return entities.map((e) => CardMapper.toDomain(e));
  }

  async findIdsBySet(setId: SetId): Promise<CardId[]> {
    const rows = await this.repository.find({
      where: { setId: setId.toString() },
      select: { id: true },
    });
    return rows.map((r) => CardId.create(r.id));
  }

  async save(card: CardAggregate): Promise<void> {
    await this.repository.save(CardMapper.toPersistence(card));
  }
}
