import { OfficialCatalogSnapshot } from './official-catalog-client';
import { RiotSourceMapper } from './riot-source.mapper';

interface GalleryBlade {
  type?: unknown;
  cards?: { items?: unknown[]; async?: { metadata?: Record<string, unknown> } };
  sets?: { items?: unknown[]; async?: { metadata?: Record<string, unknown> } };
}

export interface ParseOptions {
  fetchedVia: 'next-data' | 'playwright';
}

export function parseNextDataGallery(
  data: Record<string, unknown>,
  opts: ParseOptions,
): OfficialCatalogSnapshot {
  const blades = (
    (data.props as Record<string, unknown> | undefined)?.pageProps as
      | Record<string, unknown>
      | undefined
  )?.page as { blades?: GalleryBlade[] } | undefined;
  const gallery = blades?.blades?.find((b) => b.type === 'riftboundCardGallery');
  if (!gallery) {
    throw new Error('riftboundCardGallery blade not found in __NEXT_DATA__');
  }

  const rawCards = Array.isArray(gallery.cards?.items)
    ? (gallery.cards!.items as Record<string, unknown>[])
    : [];
  const rawSets = Array.isArray(gallery.sets?.items)
    ? (gallery.sets!.items as Record<string, unknown>[])
    : [];

  const { cards, sets } = RiotSourceMapper.mapSnapshot({ cards: rawCards, sets: rawSets });

  const meta = gallery.cards?.async?.metadata ?? {};
  const totalItems = typeof meta.totalItems === 'number' ? meta.totalItems : cards.length;
  const resultsUpdatedAt = typeof meta.resultsUpdatedAt === 'string' ? meta.resultsUpdatedAt : '';

  return {
    cards,
    sets,
    meta: {
      embeddedCount: cards.length,
      totalItems,
      resultsUpdatedAt,
      fetchedVia: opts.fetchedVia,
    },
  };
}
