import { CatalogSyncService } from './catalog-sync.service';

describe('CatalogSyncService (stub)', () => {
  it('throws not-implemented from syncBatch until Task 5.2 lands', async () => {
    const service = new CatalogSyncService(null as never, null as never, null as never);
    await expect(service.syncBatch({} as never)).rejects.toThrow(/not implemented/i);
  });
});
