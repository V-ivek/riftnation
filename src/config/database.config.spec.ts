import { databaseOptionsFromEnv } from './database.config';

describe('databaseOptionsFromEnv', () => {
  const previous = process.env.DATABASE_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  });

  it('throws without DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(() => databaseOptionsFromEnv()).toThrow(/DATABASE_URL/);
  });

  it('returns postgres options when set', () => {
    process.env.DATABASE_URL = 'postgres://u:p@h:5432/db';
    const opts = databaseOptionsFromEnv();
    expect(opts.type).toBe('postgres');
    expect((opts as { url?: string }).url).toBe('postgres://u:p@h:5432/db');
    expect(opts.synchronize).toBe(false);
  });
});
