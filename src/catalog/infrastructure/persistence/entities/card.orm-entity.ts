import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SetOrmEntity } from './set.orm-entity';

@Entity({ name: 'cards' })
export class CardOrmEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'set_id', type: 'text' })
  setId!: string;

  @ManyToOne(() => SetOrmEntity, { nullable: false })
  @JoinColumn({ name: 'set_id' })
  set!: SetOrmEntity;

  @Column({ name: 'collector_number', type: 'int' })
  collectorNumber!: number;

  @Column({ name: 'public_code', type: 'text' })
  publicCode!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  rarity!: string;

  @Column({ name: 'card_types', type: 'text', array: true, default: '{}' })
  cardTypes!: string[];

  @Column({ name: 'card_super_type', type: 'text', nullable: true })
  cardSuperType!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  domains!: string[];

  @Column({ name: 'energy_cost', type: 'int', nullable: true })
  energyCost!: number | null;

  @Column({ type: 'int', nullable: true })
  might!: number | null;

  @Column({ type: 'int', nullable: true })
  power!: number | null;

  @Column({ name: 'might_bonus', type: 'int', nullable: true })
  mightBonus!: number | null;

  @Column({ type: 'text' })
  orientation!: string;

  @Column({ name: 'rules_text_html', type: 'text' })
  rulesTextHtml!: string;

  @Column({ name: 'effect_text_html', type: 'text', nullable: true })
  effectTextHtml!: string | null;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl!: string;

  @Column({ name: 'image_alt', type: 'text', nullable: true })
  imageAlt!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  illustrators!: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'jsonb' })
  raw!: Record<string, unknown>;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'synced_at', type: 'timestamptz' })
  syncedAt!: Date;
}
