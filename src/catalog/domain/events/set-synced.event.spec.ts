import { SetSynced } from './set-synced.event';

describe('SetSynced', () => {
  it('exposes a stable TYPE string and stores payload verbatim', () => {
    expect(SetSynced.TYPE).toBe('catalog.set.synced');
    const at = new Date('2026-04-18T00:00:00Z');
    const event = new SetSynced({ setId: 'UNL', name: 'Unleashed', at });
    expect(event.payload.setId).toBe('UNL');
    expect(event.payload.name).toBe('Unleashed');
    expect(event.payload.at).toEqual(at);
  });
});
