import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SetFactory } from '../factories/set.factory';
import { CardFactory } from '../factories/card.factory';
import { toCardRefreshParams } from '../factories/card-refresh-params';
import { SyncSummary, emptySummary } from './sync-summary';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from '../../infrastructure/source/official-catalog-client';
import { SetRepositoryImpl } from '../../infrastructure/persistence/repositories/set.repository.impl';
import { CardRepositoryImpl } from '../../infrastructure/persistence/repositories/card.repository.impl';
import { SetOrmEntity } from '../../infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from '../../infrastructure/persistence/entities/card.orm-entity';
import { SetId } from '../../domain/value-objects/set-id.vo';
import { CardId } from '../../domain/value-objects/card-id.vo';
import { CollectorNumber } from '../../domain/value-objects/collector-number.vo';
import { CardAggregate } from '../../domain/aggregates/card.aggregate';
import { SetAggregate } from '../../domain/aggregates/set.aggregate';
import { CardSourceRecord, SetSourceRecord } from '../ports/source-records';
import { CardMetadataChanged } from '../../domain/events/card-metadata-changed.event';
import { CardSynced } from '../../domain/events/card-synced.event';
import { SetSynced } from '../../domain/events/set-synced.event';

type DomainEvent = SetSynced | CardSynced | CardMetadataChanged;

@Injectable()
export class CatalogSyncService {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly setFactory: SetFactory,
    private readonly cardFactory: CardFactory,
  ) {}

  async syncBatch(snapshot: OfficialCatalogSnapshot): Promise<SyncSummary> {
    const started = Date.now();
    const now = new Date();
    const summary = emptySummary(
      snapshot.meta.fetchedVia,
      snapshot.meta.embeddedCount,
      snapshot.meta.totalItems,
    );
    const events: DomainEvent[] = [];

    await this.ds.transaction(async (manager) => {
      const setRepo = new SetRepositoryImpl(manager.getRepository(SetOrmEntity));
      const cardRepo = new CardRepositoryImpl(manager.getRepository(CardOrmEntity));

      // 1. Sets
      for (const record of snapshot.sets) {
        summary.sets.seen++;
        const id = SetId.create(record.id);
        const existing = await setRepo.findById(id);
        if (!existing) {
          const set = this.setFactory.fromSource(record, now);
          await setRepo.save(set);
          summary.sets.added++;
          events.push(new SetSynced({ setId: id.toString(), name: set.name, at: now }));
        } else if (setChanged(existing, record)) {
          existing.refreshFromSource({
            name: record.name,
            collectorNumberMax: CollectorNumber.create(record.collector_number_max),
            raw: record.raw,
            syncedAt: now,
          });
          await setRepo.save(existing);
          summary.sets.updated++;
          events.push(new SetSynced({ setId: id.toString(), name: existing.name, at: now }));
        } else {
          summary.sets.unchanged++;
        }
      }

      // 2. Cards
      for (const record of snapshot.cards) {
        summary.cards.seen++;
        const id = CardId.create(record.id);
        const existing = await cardRepo.findById(id);

        if (!existing) {
          const card = this.cardFactory.fromSource(record, now);
          await cardRepo.save(card);
          summary.cards.added++;
          events.push(new CardSynced({ cardId: id.toString(), setId: record.set_id, at: now }));
          continue;
        }

        const changedFields = computeChangedFields(existing, record);
        const wasTombstoned = existing.deletedAt !== null;

        if (!wasTombstoned && changedFields.length === 0) {
          summary.cards.unchanged++;
          continue;
        }

        if (wasTombstoned) {
          existing.restore();
          summary.cards.restored++;
        }
        existing.refreshFromSource(toCardRefreshParams(record, now));
        await cardRepo.save(existing);

        if (!wasTombstoned) {
          summary.cards.updated++;
        }
        events.push(new CardSynced({ cardId: id.toString(), setId: record.set_id, at: now }));
        if (changedFields.length > 0) {
          events.push(
            new CardMetadataChanged({
              cardId: id.toString(),
              setId: record.set_id,
              changedFields,
              at: now,
            }),
          );
        }
      }

      // 3. Tombstones — for each set present in the snapshot's cards
      const snapshotCardIdsBySet = groupCardIdsBySet(snapshot.cards);
      for (const [setIdStr, snapshotIds] of snapshotCardIdsBySet) {
        const setId = SetId.create(setIdStr);
        const dbIds = await cardRepo.findIdsBySet(setId);
        for (const dbId of dbIds) {
          if (snapshotIds.has(dbId.toString())) continue;
          const orphan = await cardRepo.findById(dbId);
          if (!orphan || orphan.deletedAt !== null) continue;
          orphan.markDeleted(now);
          await cardRepo.save(orphan);
          summary.cards.tombstoned++;
        }
      }
    });

    summary.durationMs = Date.now() - started;
    this.logger.log(
      `synced sets=${summary.sets.seen} cards=${summary.cards.seen} added=${summary.cards.added} updated=${summary.cards.updated} unchanged=${summary.cards.unchanged} tombstoned=${summary.cards.tombstoned} restored=${summary.cards.restored} via=${summary.fetchedVia} duration=${summary.durationMs}ms`,
    );
    for (const event of events) {
      this.logger.debug(`event ${event.constructor.name} ${JSON.stringify(event.payload)}`);
    }
    return summary;
  }

  async syncFromClient(client: OfficialCatalogClient): Promise<SyncSummary> {
    const snapshot = await client.fetchCatalog();
    return this.syncBatch(snapshot);
  }
}

function setChanged(existing: SetAggregate, record: SetSourceRecord): boolean {
  return (
    existing.name !== record.name || existing.collectorNumberMax !== record.collector_number_max
  );
}

function computeChangedFields(existing: CardAggregate, record: CardSourceRecord): string[] {
  const changed: string[] = [];
  const check = (field: string, lhs: unknown, rhs: unknown) => {
    if (!deepEquals(lhs, rhs)) changed.push(field);
  };

  const expectedTags = normalizeArray(record.tags);
  const expectedTypes = normalizeArray(record.card_types);
  const expectedDomains = normalizeArray(record.domains);
  const expectedIllustrators = normalizeArray(record.illustrators);

  check('collectorNumber', existing.collectorNumber, record.collector_number);
  check('name', existing.name, record.name);
  check('publicCode', existing.publicCode, record.public_code.toUpperCase());
  check('rarity', existing.rarity, record.rarity);
  check('cardTypes', existing.cardTypes, expectedTypes);
  check(
    'cardSuperType',
    existing.cardSuperType,
    record.card_super_type ? record.card_super_type.toLowerCase() : null,
  );
  check('domains', existing.domains, expectedDomains);
  check('energyCost', existing.energyCost, record.energy_cost);
  check('might', existing.might, record.might);
  check('power', existing.power, record.power);
  check('mightBonus', existing.mightBonus, record.might_bonus);
  check('orientation', existing.orientation, record.orientation);
  check('rulesTextHtml', existing.rulesTextHtml, record.rules_text_html);
  check('effectTextHtml', existing.effectTextHtml, record.effect_text_html);
  check('imageUrl', existing.imageUrl, record.image_url);
  check('imageAlt', existing.imageAlt, record.image_alt);
  check('illustrators', existing.illustrators, expectedIllustrators);
  check('tags', existing.tags, expectedTags);

  return changed;
}

function normalizeArray(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => v.toLowerCase()),
    ),
  ];
}

function deepEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEquals(a[i], b[i])) return false;
    return true;
  }
  return false;
}

function groupCardIdsBySet(cards: CardSourceRecord[]): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const card of cards) {
    let bucket = groups.get(card.set_id);
    if (!bucket) {
      bucket = new Set<string>();
      groups.set(card.set_id, bucket);
    }
    bucket.add(card.id);
  }
  return groups;
}
