export interface SyncSummary {
  sets: {
    seen: number;
    added: number;
    updated: number;
    unchanged: number;
  };
  cards: {
    seen: number;
    added: number;
    updated: number;
    unchanged: number;
    tombstoned: number;
    restored: number;
  };
  fetchedVia: 'next-data' | 'playwright';
  embeddedCount: number;
  totalItems: number;
  durationMs: number;
}

export function emptySummary(
  fetchedVia: SyncSummary['fetchedVia'] = 'next-data',
  embeddedCount = 0,
  totalItems = 0,
): SyncSummary {
  return {
    sets: { seen: 0, added: 0, updated: 0, unchanged: 0 },
    cards: { seen: 0, added: 0, updated: 0, unchanged: 0, tombstoned: 0, restored: 0 },
    fetchedVia,
    embeddedCount,
    totalItems,
    durationMs: 0,
  };
}
