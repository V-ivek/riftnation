import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'sets' })
export class SetOrmEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'collector_number_max', type: 'int' })
  collectorNumberMax!: number;

  @Column({ type: 'jsonb' })
  raw!: Record<string, unknown>;

  @Column({ name: 'synced_at', type: 'timestamptz' })
  syncedAt!: Date;
}
