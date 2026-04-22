import { DataSourceOptions } from 'typeorm';
import { SetOrmEntity } from '../catalog/infrastructure/persistence/entities/set.orm-entity';
import { CardOrmEntity } from '../catalog/infrastructure/persistence/entities/card.orm-entity';

export function databaseOptionsFromEnv(): DataSourceOptions {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return {
    type: 'postgres',
    url,
    entities: [SetOrmEntity, CardOrmEntity],
    migrations: ['src/catalog/infrastructure/persistence/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
  };
}
