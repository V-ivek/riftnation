import { CardSynced } from './card-synced.event';

describe('CardSynced', () => {
  it('exposes a stable TYPE string and stores payload verbatim', () => {
    expect(CardSynced.TYPE).toBe('catalog.card.synced');
    const at = new Date('2026-04-18T00:00:00Z');
    const event = new CardSynced({ cardId: 'unl-131-219', setId: 'UNL', at });
    expect(event.payload.cardId).toBe('unl-131-219');
    expect(event.payload.setId).toBe('UNL');
    expect(event.payload.at).toEqual(at);
  });
});
