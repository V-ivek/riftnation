# Catalog RFC Addendum — observed fields from live source

**Date:** 2026-04-18
**Status:** proposed — extends `docs/prompts/riftnation-catalog-ddd-rfc-nestjs.md` v0.1
**Scope:** adds eight fields to the `Card` aggregate and its ORM entity that exist in Riot's
  live payload but were not in the RFC v0.1 schema. No changes to the RFC's contexts, aggregates,
  or layering.

## 1. Why this addendum exists

When the sync design walked the actual `__NEXT_DATA__` payload from
`https://riftbound.leagueoflegends.com/en-us/card-gallery/` across all 950 embedded cards, eight
fields appeared that the RFC schema does not capture. Every one of them is either
user-facing, queryable, or has distinct domain semantics. They all belong as first-class attributes
on `CardAggregate` rather than living only in `raw` jsonb.

## 2. Observed source shape (evidence)

Across all 950 cards:

| Field | Presence | Shape |
|---|---|---|
| `id` | 950 | string, e.g. `unl-131-219` |
| `publicCode` | 950 | string, e.g. `UNL-131/219` |
| `collectorNumber` | 950 | int |
| `name` | 950 | string |
| `set.value.id` | 950 | string (`OGN`/`OGS`/`SFD`/`UNL`/`VEN`) |
| `rarity.value.id` | 950 | `common` / `uncommon` / `rare` / `epic` / `showcase` |
| `cardType.type[].id` | 950 | `spell` / `battlefield` / `unit` / `gear` / `legend` / `rune` |
| `cardType.superType[0].id` | 293 | `champion` / `signature` / `token` / `basic` |
| `domain.values[].id` | 950 | one or more of 7 domains; 142 cards have ≥2 |
| `orientation` | 950 | `portrait` (894) / `landscape` (56) |
| `text.richText.body` | 950 | rich HTML ability text |
| `cardImage.url` | 950 | Sanity CDN URL |
| `cardImage.accessibilityText` | 950 | alt text |
| `illustrator.values[].label` | 950 | one or more artist names |
| `energy.value.id` | 773 | int (nullable when absent) |
| `tags.tags` | 657 | flat `string[]` — Runeterra lore tags |
| `might.value.id` | 491 | int |
| `power.value.id` | 402 | int |
| `mightBonus.value.id` | 36 | int |
| `effect.richText.body` | 27 | rich HTML secondary text |

Seven distinct domain ids: `body`, `calm`, `chaos`, `colorless`, `fury`, `mind`, `order`.
Colorless never mixes with another domain (zero occurrences out of 950). Multi-domain cards: 142.

One duplicate row in the embedded payload — `ogn-121a-298` Teemo appears twice identically.
Dedupe by `id` at map time.

## 3. Fields to add

For each, the RFC already has a close peer — the table shows the addition.

| RFC v0.1 card state | Added | Rationale |
|---|---|---|
| (none) | `publicCode` | User-facing printed code (`UNL-131/219`). Dubai community already quotes this. |
| (none) | `cardSuperType` | `champion` / `signature` / `token` / `basic` — distinct gameplay semantics from `cardType`; 293/950 cards carry it. |
| `might` | `power` | Distinct stat (e.g. rune `power`), not an alias — 402 cards have a power value. |
| `might` | `mightBonus` | Only on 36 cards (gear with `+N` might); distinct semantics. |
| (none) | `orientation` | Portrait/landscape; affects UI rendering. |
| `rulesTextHtml` | `effectTextHtml` | Secondary rich text; only 27 cards have it but they are distinct gameplay effects. |
| (none) | `tags` | Runeterra lore tags (`["Piltover","Ahri"]`) — primary faceted-filter dimension for marketplace. |
| (none) | `deletedAt` | Tombstone for cards that disappear upstream — keeps downstream references valid. |

## 4. Updated `Card` aggregate

State (RFC §5.2 + additions):

```
id
setId
collectorNumber
publicCode               ← added
name
rarity
cardTypes
cardSuperType            ← added (nullable)
domains
energyCost
might
power                    ← added (nullable)
mightBonus               ← added (nullable)
orientation              ← added
rulesTextHtml
effectTextHtml           ← added (nullable)
imageUrl
imageAlt
illustrators
tags                     ← added (default [])
raw
syncedAt
deletedAt                ← added (nullable)
```

Added invariants:

- `publicCode` must not be blank.
- `cardSuperType`, if present, must not be blank.
- `orientation` must be one of `portrait` or `landscape`.
- `power`, `mightBonus`, if present, must be integers `>= 0`.
- `tags` must not contain blank values (same normalization rule as `cardTypes`).
- `deletedAt`, if set, must not be in the future.

## 5. New value objects

Follow the same pattern as the RFC's existing VOs (private constructor, static `create`,
normalization, invariant checks):

- `PublicCode` — trim, not blank.
- `CardSuperType` — trim, lower-case, not blank.
- `Orientation` — must be `portrait` or `landscape`.
- `Power` — positive integer or zero.
- `MightBonus` — positive integer or zero.
- `EffectTextHtml` — trim, not blank.
- `Tag` — trim, not blank; aggregate normalizes the array via the existing
  `normalizeUniqueStrings` helper.

## 6. Updated `CardOrmEntity`

Columns to add to the RFC's `cards` table:

| column | type | nullable | notes |
|---|---|---|---|
| `public_code` | `text` | no | e.g. `UNL-131/219` |
| `card_super_type` | `text` | yes | |
| `power` | `int` | yes | |
| `might_bonus` | `int` | yes | |
| `orientation` | `text` | no | check constraint `in ('portrait','landscape')` |
| `effect_text_html` | `text` | yes | |
| `tags` | `text[]` | no (default `'{}'`) | |
| `deleted_at` | `timestamptz` | yes | |

Existing columns `rarity`, `card_types`, `domains`, `energy_cost`, `might`, `rules_text_html`,
`image_url`, `image_alt`, `illustrators` stay as the RFC defines them. `collector_number` becomes
`NOT NULL` (RFC v0.1 doesn't specify, but it's never absent in the data).

## 7. Updated read models

- `CardSummaryReadModel` adds: `publicCode`, `cardSuperType`, `orientation`, `power`, `tags`.
  (Might bonus / effect text are detail-page concerns, not summary.)
- `CardDetailsReadModel` adds all eight fields.

## 8. Factory and refresh mapper changes

- `CardFactory.fromSource` accepts the new snake_case source fields and constructs the VOs.
- The refresh helper (`docs/prompts/riftnation-catalog-refresh-helper.ts`) gains matching fields
  and uses the new VOs instead of primitive pass-through.

## 9. Non-goals for this addendum

- No new aggregates or contexts. Listings, collections, pricing stay out of Catalog.
- No read-model separation (RFC §14.4) — still deferred.
- No new events beyond the RFC's `SetSynced`, `CardSynced`, `CardMetadataChanged`. The
  last one now covers the eight additional fields as well.

## 10. Open call-outs for the RFC author

- Is `tags` the right name, or should we match Riot's `tags.tags` wording? Recommendation: keep
  `tags`; it's the least surprising.
- `cardSuperType` could be an array upstream in the future — today every card with a superType
  has exactly one. If the author prefers future-proofing, model it as `string[]` from day 1.
  Recommendation: start with scalar; promote to array if Riot ever ships a second value.
- `deleted_at` implies soft-delete semantics — consistent with the RFC's "preserve raw payloads"
  spirit but worth a review from the RFC author.
