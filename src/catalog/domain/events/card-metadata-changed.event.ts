export interface CardMetadataChangedPayload {
  cardId: string;
  setId: string;
  changedFields: string[];
  at: Date;
}

export class CardMetadataChanged {
  static readonly TYPE = 'catalog.card.metadata_changed';
  constructor(readonly payload: CardMetadataChangedPayload) {}
}
