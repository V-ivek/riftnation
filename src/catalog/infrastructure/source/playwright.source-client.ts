import { Injectable, Logger } from '@nestjs/common';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from './official-catalog-client';
import { parseNextDataGallery } from './next-data.parser';

export interface PlaywrightSourceClientOptions {
  url: string;
  userAgent?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class PlaywrightSourceClient implements OfficialCatalogClient {
  private readonly logger = new Logger(PlaywrightSourceClient.name);
  private readonly url: string;
  private readonly userAgent: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: PlaywrightSourceClientOptions) {
    this.url = options.url;
    this.userAgent = options.userAgent;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext(
        this.userAgent ? { userAgent: this.userAgent } : undefined,
      );
      const page = await context.newPage();
      await page.goto(this.url, { waitUntil: 'networkidle', timeout: this.timeoutMs });

      const dataText = await page.evaluate(() => {
        const el = document.getElementById('__NEXT_DATA__');
        return el ? el.textContent : null;
      });

      if (!dataText) {
        throw new Error('PlaywrightSourceClient: no __NEXT_DATA__ script tag on the rendered page');
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataText);
      } catch (err) {
        throw new Error(
          `PlaywrightSourceClient: __NEXT_DATA__ is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return parseNextDataGallery(data, { fetchedVia: 'playwright' });
    } finally {
      await browser.close();
    }
  }
}
