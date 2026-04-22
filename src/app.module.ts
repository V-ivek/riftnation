import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptionsFromEnv } from './config/database.config';
import { CatalogModule } from './catalog/catalog.module';

const DEFAULT_GALLERY_URL = 'https://riftbound.leagueoflegends.com/en-us/card-gallery/';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptionsFromEnv() }),
    CatalogModule.forRoot(process.env.RIFTBOUND_GALLERY_URL ?? DEFAULT_GALLERY_URL),
  ],
})
export class AppModule {}
