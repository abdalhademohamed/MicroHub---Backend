import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// نحدد مسار ملف الـ env بدقة
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  migrationsTransactionMode: 'each',
});