import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCatalog1713412800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS sets (
        id                    text PRIMARY KEY,
        name                  text NOT NULL,
        collector_number_max  int  NOT NULL,
        raw                   jsonb NOT NULL,
        synced_at             timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id                text PRIMARY KEY,
        set_id            text NOT NULL REFERENCES sets(id),
        collector_number  int  NOT NULL,
        public_code       text NOT NULL,
        name              text NOT NULL,
        rarity            text NOT NULL,
        card_types        text[] NOT NULL DEFAULT '{}',
        card_super_type   text,
        domains           text[] NOT NULL DEFAULT '{}',
        energy_cost       int,
        might             int,
        power             int,
        might_bonus       int,
        orientation       text NOT NULL CHECK (orientation IN ('portrait','landscape')),
        rules_text_html   text NOT NULL,
        effect_text_html  text,
        image_url         text NOT NULL,
        image_alt         text,
        illustrators      text[] NOT NULL DEFAULT '{}',
        tags              text[] NOT NULL DEFAULT '{}',
        raw               jsonb NOT NULL,
        deleted_at        timestamptz,
        synced_at         timestamptz NOT NULL DEFAULT now()
      );
    `);

    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_set_coll ON cards(set_id, collector_number);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_card_types ON cards USING GIN (card_types);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_domains ON cards USING GIN (domains);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_tags ON cards USING GIN (tags);`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_cards_raw ON cards USING GIN (raw);`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS cards;`);
    await q.query(`DROP TABLE IF EXISTS sets;`);
  }
}
