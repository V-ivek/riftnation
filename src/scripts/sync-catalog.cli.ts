import 'reflect-metadata';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CatalogSyncService } from '../catalog/application/services/catalog-sync.service';
import {
  OFFICIAL_CATALOG_CLIENT,
  OfficialCatalogClient,
} from '../catalog/infrastructure/source/official-catalog-client';

export interface RunResult {
  exitCode: 0 | 1;
  output: string;
}

export async function runSyncCatalog(app: INestApplicationContext): Promise<RunResult> {
  try {
    const sync = app.get(CatalogSyncService);
    const client = app.get<OfficialCatalogClient>(OFFICIAL_CATALOG_CLIENT);
    const summary = await sync.syncFromClient(client);
    return {
      exitCode: 0,
      output: JSON.stringify({ ok: true, ...summary }),
    };
  } catch (err) {
    return {
      exitCode: 1,
      output: JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const result = await runSyncCatalog(app);
    if (result.exitCode === 0) {
      process.stdout.write(result.output + '\n');
    } else {
      process.stderr.write(result.output + '\n');
    }
    process.exit(result.exitCode);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main();
}
