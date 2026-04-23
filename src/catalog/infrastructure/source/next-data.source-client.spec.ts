import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { AddressInfo } from 'net';
import { NextDataSourceClient } from './next-data.source-client';

const fixtureHtml = fs.readFileSync(
  path.resolve(__dirname, '../../../../test/fixtures/gallery-min.html'),
  'utf8',
);

type HandlerState = {
  attempts: number;
  failFirst: number;
  bodyOverride?: string;
};

function startServer(state: HandlerState): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      state.attempts++;
      if (state.attempts <= state.failFirst) {
        res.writeHead(503);
        res.end('please retry');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(state.bodyOverride ?? fixtureHtml);
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

describe('NextDataSourceClient', () => {
  it('fetches, extracts NEXT_DATA, and returns a source-record snapshot', async () => {
    const state: HandlerState = { attempts: 0, failFirst: 0 };
    const server = await startServer(state);
    try {
      const client = new NextDataSourceClient({ url: urlOf(server) });
      const snapshot = await client.fetchCatalog();
      expect(snapshot.sets.length).toBeGreaterThan(0);
      expect(snapshot.cards.length).toBeGreaterThan(0);
      expect(snapshot.meta.fetchedVia).toBe('next-data');
      expect(snapshot.meta.embeddedCount).toBe(snapshot.cards.length);
      expect(snapshot.meta.totalItems).toBeGreaterThanOrEqual(snapshot.meta.embeddedCount);
      expect(state.attempts).toBe(1);
    } finally {
      await close(server);
    }
  });

  it('retries on transient 5xx and eventually succeeds', async () => {
    const state: HandlerState = { attempts: 0, failFirst: 2 };
    const server = await startServer(state);
    try {
      const client = new NextDataSourceClient({
        url: urlOf(server),
        retryDelaysMs: [10, 20, 40], // fast retries for the test
      });
      const snapshot = await client.fetchCatalog();
      expect(snapshot.cards.length).toBeGreaterThan(0);
      expect(state.attempts).toBe(3);
    } finally {
      await close(server);
    }
  });

  it('throws after exhausting retries on persistent 5xx', async () => {
    const state: HandlerState = { attempts: 0, failFirst: 99 };
    const server = await startServer(state);
    try {
      const client = new NextDataSourceClient({
        url: urlOf(server),
        retryDelaysMs: [5, 5, 5],
      });
      await expect(client.fetchCatalog()).rejects.toThrow(/after 4 attempts/i);
    } finally {
      await close(server);
    }
  });

  it('throws when the page has no __NEXT_DATA__ block', async () => {
    const state: HandlerState = {
      attempts: 0,
      failFirst: 0,
      bodyOverride: '<html><body><p>no data here</p></body></html>',
    };
    const server = await startServer(state);
    try {
      const client = new NextDataSourceClient({ url: urlOf(server) });
      await expect(client.fetchCatalog()).rejects.toThrow(/__NEXT_DATA__/);
    } finally {
      await close(server);
    }
  });

  it('throws when the gallery blade is missing', async () => {
    const body = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: { pageProps: { page: { blades: [{ type: 'textMasthead' }] } } },
    })}</script></body></html>`;
    const state: HandlerState = { attempts: 0, failFirst: 0, bodyOverride: body };
    const server = await startServer(state);
    try {
      const client = new NextDataSourceClient({ url: urlOf(server) });
      await expect(client.fetchCatalog()).rejects.toThrow(/riftboundCardGallery/);
    } finally {
      await close(server);
    }
  });
});
