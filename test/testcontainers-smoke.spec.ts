import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

describe('testcontainers', () => {
  it('boots postgres and runs SELECT 1', async () => {
    const container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    const res = await client.query('SELECT 1 AS one');
    expect(res.rows[0].one).toBe(1);
    await client.end();
    await container.stop();
  }, 60_000);
});
