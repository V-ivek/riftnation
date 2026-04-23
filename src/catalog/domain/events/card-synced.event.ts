export interface CardSyncedPayload {
  cardId: string;
  setId: string;
  at: Date;
}

export class CardSynced {
  static readonly TYPE = 'catalog.card.synced';
  constructor(readonly payload: CardSyncedPayload) {}
}
