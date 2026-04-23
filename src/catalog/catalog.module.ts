import { DynamicModule, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetOrmEntity } from './infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from './infrastructure/persistence/entities/card.orm-entity';
import { SET_REPOSITORY } from './domain/repositories/set.repository';
import { CARD_REPOSITORY } from './domain/repositories/card.repository';
import { SetRepositoryImpl } from './infrastructure/persistence/repositories/set.repository.impl';
import { CardRepositoryImpl } from './infrastructure/persistence/repositories/card.repository.impl';
import { SetFactory } from './application/factories/set.factory';
import { CardFactory } from './application/factories/card.factory';
import { CatalogSyncService } from './application/services/catalog-sync.service';
import {
  OFFICIAL_CATALOG_CLIENT,
  OfficialCatalogClient,
} from './infrastructure/source/official-catalog-client';
import { NextDataSourceClient } from './infrastructure/source/next-data.source-client';
import { PlaywrightSourceClient } from './infrastructure/source/playwright.source-client';
import { CompositeSourceClient } from './infrastructure/source/composite.source-client';

const SHARED_PROVIDERS: Provider[] = [
  SetFactory,
  CardFactory,
  CatalogSyncService,
  { provide: SET_REPOSITORY, useClass: SetRepositoryImpl },
  { provide: CARD_REPOSITORY, useClass: CardRepositoryImpl },
];

const SHARED_IMPORTS = [TypeOrmModule.forFeature([SetOrmEntity, CardOrmEntity])];
const SHARED_EXPORTS = [CatalogSyncService];

@Module({})
export class CatalogModule {
  static forRoot(galleryUrl: string): DynamicModule {
    return {
      module: CatalogModule,
      imports: SHARED_IMPORTS,
      providers: [
        ...SHARED_PROVIDERS,
        {
          provide: OFFICIAL_CATALOG_CLIENT,
          useFactory: () =>
            new CompositeSourceClient({
              primary: new NextDataSourceClient({ url: galleryUrl }),
              fallback: new PlaywrightSourceClient({ url: galleryUrl }),
            }),
        },
      ],
      exports: SHARED_EXPORTS,
    };
  }

  static forTest(options: { sourceClient: OfficialCatalogClient }): DynamicModule {
    return {
      module: CatalogModule,
      imports: SHARED_IMPORTS,
      providers: [
        ...SHARED_PROVIDERS,
        { provide: OFFICIAL_CATALOG_CLIENT, useValue: options.sourceClient },
      ],
      exports: SHARED_EXPORTS,
    };
  }
}
