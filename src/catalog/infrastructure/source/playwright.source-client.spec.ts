import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AddressInfo } from 'net';
import { PlaywrightSourceClient } from './playwright.source-client';

const fixtureHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../test/fixtures/gallery-min.html'),
  'utf8',
);

function startServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fixtureHtml);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

function urlOf(server: http.Server): string {
  const { port, address } = server.address() as AddressInfo;
  return `http://${address}:${port}/`;
}

const SKIP = process.env.CI_SKIP_PLAYWRIGHT === '1';

describe.skipIf(SKIP)('PlaywrightSourceClient', () => {
  it('renders the gallery page with headless Chromium and returns a snapshot', async () => {
    const server = await startServer();
    try {
      const client = new PlaywrightSourceClient({ url: urlOf(server) });
      const snapshot = await client.fetchCatalog();
      expect(snapshot.meta.fetchedVia).toBe('playwright');
      expect(snapshot.cards.length).toBeGreaterThan(0);
      expect(snapshot.sets.length).toBeGreaterThan(0);
      expect(snapshot.meta.totalItems).toBeGreaterThanOrEqual(snapshot.meta.embeddedCount);
    } finally {
      await close(server);
    }
  }, 60_000);

  it('throws a clear error when the rendered page has no NEXT_DATA', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<html><body><p>empty</p></body></html>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const client = new PlaywrightSourceClient({ url: urlOf(server) });
      await expect(client.fetchCatalog()).rejects.toThrow(/__NEXT_DATA__/);
    } finally {
      await close(server);
    }
  }, 60_000);
});
