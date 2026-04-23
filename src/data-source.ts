import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptionsFromEnv } from './config/database.config';

export const AppDataSource = new DataSource(databaseOptionsFromEnv());
