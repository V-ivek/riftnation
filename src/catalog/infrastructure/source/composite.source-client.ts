import { Injectable, Logger } from '@nestjs/common';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from './official-catalog-client';
import { CardSourceRecord, SetSourceRecord } from '../../application/ports/source-records';

export interface CompositeSourceClientOptions {
  primary: OfficialCatalogClient;
  fallback: OfficialCatalogClient;
  threshold?: number;
}

const DEFAULT_THRESHOLD = 20;

@Injectable()
export class CompositeSourceClient implements OfficialCatalogClient {
  private readonly logger = new Logger(CompositeSourceClient.name);
  private readonly primary: OfficialCatalogClient;
  private readonly fallback: OfficialCatalogClient;
  private readonly threshold: number;

  constructor(options: CompositeSourceClientOptions) {
    this.primary = options.primary;
    this.fallback = options.fallback;
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD;
  }

  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    let primarySnapshot: OfficialCatalogSnapshot | null = null;
    try {
      primarySnapshot = await this.primary.fetchCatalog();
    } catch (err) {
      this.logger.warn(
        `primary client failed, invoking fallback: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.fallback.fetchCatalog();
    }

    const gap = Math.max(0, primarySnapshot.meta.totalItems - primarySnapshot.meta.embeddedCount);
    this.logger.log(
      `primary fetch ok — embedded=${primarySnapshot.meta.embeddedCount} total=${primarySnapshot.meta.totalItems} gap=${gap} threshold=${this.threshold}`,
    );

    if (gap <= this.threshold) {
      return primarySnapshot;
    }

    this.logger.warn(`gap ${gap} exceeds threshold ${this.threshold} — invoking fallback`);
    const fallbackSnapshot = await this.fallback.fetchCatalog();
    return mergeSnapshots(primarySnapshot, fallbackSnapshot);
  }
}

function mergeSnapshots(
  primary: OfficialCatalogSnapshot,
  fallback: OfficialCatalogSnapshot,
): OfficialCatalogSnapshot {
  const cards = mergeById(primary.cards, fallback.cards, (c) => c.id);
  const sets = mergeById(primary.sets, fallback.sets, (s) => s.id);
  return {
    cards,
    sets,
    meta: {
      embeddedCount: cards.length,
      totalItems: fallback.meta.totalItems,
      resultsUpdatedAt: fallback.meta.resultsUpdatedAt || primary.meta.resultsUpdatedAt,
      fetchedVia: 'playwright',
    },
  };
}

function mergeById<T extends CardSourceRecord | SetSourceRecord>(
  primary: T[],
  fallback: T[],
  getId: (item: T) => string,
): T[] {
  const result = new Map<string, T>();
  for (const item of primary) result.set(getId(item), item);
  for (const item of fallback) result.set(getId(item), item); // fallback wins on conflicts
  return [...result.values()];
}
