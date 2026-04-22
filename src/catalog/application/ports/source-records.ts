export interface SetSourceRecord {
  id: string;
  name: string;
  collector_number_max: number;
  raw: Record<string, unknown>;
}

export interface CardSourceRecord {
  id: string;
  set_id: string;
  collector_number: number;
  public_code: string;
  name: string;
  rarity: string;
  card_types: string[];
  card_super_type: string | null;
  domains: string[];
  energy_cost: number | null;
  might: number | null;
  power: number | null;
  might_bonus: number | null;
  orientation: string;
  rules_text_html: string;
  effect_text_html: string | null;
  image_url: string;
  image_alt: string | null;
  illustrators: string[];
  tags: string[];
  raw: Record<string, unknown>;
}
