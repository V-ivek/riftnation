import { CardSourceRecord, SetSourceRecord } from '../../application/ports/source-records';

type Raw = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^-?\d+$/.test(v)) return parseInt(v, 10);
  return null;
}

function nestedString(obj: unknown, ...keys: string[]): string | null {
  let current: unknown = obj;
  for (const k of keys) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Raw)[k];
  }
  return asString(current);
}

function nestedInt(obj: unknown, ...keys: string[]): number | null {
  let current: unknown = obj;
  for (const k of keys) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Raw)[k];
  }
  return asInt(current);
}

function pluckIds(container: unknown, arrayKey: string): string[] {
  if (!container || typeof container !== 'object') return [];
  const arr = (container as Raw)[arrayKey];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (item && typeof item === 'object' ? asString((item as Raw).id) : null))
    .filter((v): v is string => v !== null);
}

function pluckLabels(container: unknown, arrayKey: string): string[] {
  if (!container || typeof container !== 'object') return [];
  const arr = (container as Raw)[arrayKey];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (item && typeof item === 'object' ? asString((item as Raw).label) : null))
    .filter((v): v is string => v !== null);
}

function firstSuperTypeId(cardType: unknown): string | null {
  if (!cardType || typeof cardType !== 'object') return null;
  const st = (cardType as Raw).superType;
  if (!Array.isArray(st) || st.length === 0) return null;
  const first = st[0];
  return first && typeof first === 'object' ? asString((first as Raw).id) : null;
}

function stringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

export class RiotSourceMapper {
  static toCardSourceRecord(source: Raw): CardSourceRecord {
    const id = asString(source.id) ?? '';
    const setId = nestedString(source, 'set', 'value', 'id') ?? '';
    const collectorNumber = asInt(source.collectorNumber) ?? 0;
    const publicCode = asString(source.publicCode) ?? '';
    const name = asString(source.name) ?? '';
    const rarity = nestedString(source, 'rarity', 'value', 'id') ?? '';
    const cardTypes = pluckIds(source.cardType, 'type');
    const cardSuperType = firstSuperTypeId(source.cardType);
    const domains = pluckIds(source.domain, 'values');
    const energyCost = nestedInt(source, 'energy', 'value', 'id');
    const might = nestedInt(source, 'might', 'value', 'id');
    const power = nestedInt(source, 'power', 'value', 'id');
    const mightBonus = nestedInt(source, 'mightBonus', 'value', 'id');
    const orientation = asString(source.orientation) ?? '';
    const rulesTextHtml = nestedString(source, 'text', 'richText', 'body') ?? '';
    const effectTextHtml = nestedString(source, 'effect', 'richText', 'body');
    const imageUrl = nestedString(source, 'cardImage', 'url') ?? '';
    const imageAlt = nestedString(source, 'cardImage', 'accessibilityText');
    const illustrators = pluckLabels(source.illustrator, 'values');
    const tags = stringArray((source.tags as Raw | undefined)?.tags);

    return {
      id,
      set_id: setId,
      collector_number: collectorNumber,
      public_code: publicCode,
      name,
      rarity,
      card_types: cardTypes,
      card_super_type: cardSuperType,
      domains,
      energy_cost: energyCost,
      might,
      power,
      might_bonus: mightBonus,
      orientation,
      rules_text_html: rulesTextHtml,
      effect_text_html: effectTextHtml,
      image_url: imageUrl,
      image_alt: imageAlt,
      illustrators,
      tags,
      raw: source,
    };
  }

  static toSetSourceRecord(source: Raw): SetSourceRecord {
    return {
      id: asString(source.id) ?? '',
      name: asString(source.name) ?? '',
      collector_number_max: asInt(source.collectorNumberMax) ?? 0,
      raw: source,
    };
  }

  static mapSnapshot(snapshot: { cards: Raw[]; sets: Raw[] }): {
    cards: CardSourceRecord[];
    sets: SetSourceRecord[];
  } {
    const seenCards = new Set<string>();
    const cards: CardSourceRecord[] = [];
    for (const raw of snapshot.cards) {
      const record = RiotSourceMapper.toCardSourceRecord(raw);
      if (seenCards.has(record.id)) continue;
      seenCards.add(record.id);
      cards.push(record);
    }

    const seenSets = new Set<string>();
    const sets: SetSourceRecord[] = [];
    for (const raw of snapshot.sets) {
      const record = RiotSourceMapper.toSetSourceRecord(raw);
      if (seenSets.has(record.id)) continue;
      seenSets.add(record.id);
      sets.push(record);
    }

    return { cards, sets };
  }
}
