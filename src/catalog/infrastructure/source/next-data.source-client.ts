import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  OfficialCatalogClient,
  OfficialCatalogSnapshot,
} from './official-catalog-client';
import { parseNextDataGallery } from './next-data.parser';

export interface NextDataSourceClientOptions {
  url: string;
  userAgent?: string;
  retryDelaysMs?: number[];
  fetchImpl?: typeof fetch;
}

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const DEFAULT_RETRY_DELAYS_MS = [1_000, 5_000, 25_000];

@Injectable()
export class NextDataSourceClient implements OfficialCatalogClient {
  private readonly logger = new Logger(NextDataSourceClient.name);
  private readonly url: string;
  private readonly userAgent: string;
  private readonly retryDelaysMs: number[];
  private readonly fetchImpl: typeof fetch;

  constructor(options: NextDataSourceClientOptions) {
    this.url = options.url;
    this.userAgent = options.userAgent ?? DEFAULT_UA;
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchCatalog(): Promise<OfficialCatalogSnapshot> {
    const html = await this.fetchHtml();
    return this.parseHtml(html);
  }

  private async fetchHtml(): Promise<string> {
    const maxAttempts = this.retryDelaysMs.length + 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.fetchImpl(this.url, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        if (res.status >= 500) {
          throw new Error(`HTTP ${res.status}`);
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} (non-retryable)`);
        }
        return await res.text();
      } catch (err) {
        lastError = err;
        if (attempt === maxAttempts) break;
        const delay = this.retryDelaysMs[attempt - 1];
        this.logger.warn(
          `fetch attempt ${attempt}/${maxAttempts} failed: ${err instanceof Error ? err.message : String(err)} — retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(
      `NextDataSourceClient failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  private parseHtml(html: string): OfficialCatalogSnapshot {
    const $ = cheerio.load(html);
    const dataText = $('#__NEXT_DATA__').html();
    if (!dataText) {
      throw new Error('NextDataSourceClient: no __NEXT_DATA__ script tag on the page');
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataText);
    } catch (err) {
      throw new Error(
        `NextDataSourceClient: __NEXT_DATA__ is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return parseNextDataGallery(data, { fetchedVia: 'next-data' });
  }
}
