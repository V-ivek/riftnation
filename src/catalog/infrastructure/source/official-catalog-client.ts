import { SetSourceRecord, CardSourceRecord } from '../../application/ports/source-records';

export const OFFICIAL_CATALOG_CLIENT = Symbol('OFFICIAL_CATALOG_CLIENT');

export interface OfficialCatalogSnapshot {
  sets: SetSourceRecord[];
  cards: CardSourceRecord[];
  meta: {
    embeddedCount: number;
    totalItems: number;
    resultsUpdatedAt: string;
    fetchedVia: 'next-data' | 'playwright';
  };
}

export interface OfficialCatalogClient {
  fetchCatalog(): Promise<OfficialCatalogSnapshot>;
}
