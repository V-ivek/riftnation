import { CardMetadataChanged } from './card-metadata-changed.event';

describe('CardMetadataChanged', () => {
  it('exposes a stable TYPE string and stores the list of changed fields', () => {
    expect(CardMetadataChanged.TYPE).toBe('catalog.card.metadata_changed');
    const at = new Date('2026-04-18T00:00:00Z');
    const event = new CardMetadataChanged({
      cardId: 'unl-131-219',
      setId: 'UNL',
      changedFields: ['rarity', 'might'],
      at,
    });
    expect(event.payload.cardId).toBe('unl-131-219');
    expect(event.payload.setId).toBe('UNL');
    expect(event.payload.changedFields).toEqual(['rarity', 'might']);
    expect(event.payload.at).toEqual(at);
  });
});
