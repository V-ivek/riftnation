import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SetFactory } from '../factories/set.factory';
import { CardFactory } from '../factories/card.factory';
import { SyncSummary } from './sync-summary';
import { OfficialCatalogSnapshot } from '../../infrastructure/source/official-catalog-client';

@Injectable()
export class CatalogSyncService {
  constructor(
    private readonly ds: DataSource,
    private readonly setFactory: SetFactory,
    private readonly cardFactory: CardFactory,
  ) {}

  async syncBatch(_snapshot: OfficialCatalogSnapshot): Promise<SyncSummary> {
    throw new Error('CatalogSyncService.syncBatch not implemented yet (Task 5.2)');
  }
}
