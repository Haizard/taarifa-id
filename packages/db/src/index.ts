import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export * from './schema/index.js';

export const connectionUrl =
  process.env.DATABASE_URL ??
  'postgresql://taarifa:taarifa_dev_2026@localhost:5432/taarifa_id';

export const pool = new Pool({ connectionString: connectionUrl });

export const db = drizzle(pool, { schema: {} });

export default db;
