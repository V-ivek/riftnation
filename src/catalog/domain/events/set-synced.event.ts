export interface SetSyncedPayload {
  setId: string;
  name: string;
  at: Date;
}

export class SetSynced {
  static readonly TYPE = 'catalog.set.synced';
  constructor(readonly payload: SetSyncedPayload) {}
}
