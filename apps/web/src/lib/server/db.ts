import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@taarifa/db/schema';

type DbSchema = typeof schema;

const globalForDb = globalThis as unknown as {
  __taarifaPool?: Pool;
  __taarifaDb?: NodePgDatabase<DbSchema>;
};

function createPool(): Pool {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://taarifa:taarifa_dev_2026@localhost:5432/taarifa_id',
    max: Number(process.env.PG_MAX_CONNECTIONS ?? 1),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    ...(process.env.DATABASE_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export const pool: Pool = globalForDb.__taarifaPool ?? createPool();
export const db: NodePgDatabase<DbSchema> =
  globalForDb.__taarifaDb ?? drizzle(pool, { schema });

if (!globalForDb.__taarifaPool) globalForDb.__taarifaPool = pool;
if (!globalForDb.__taarifaDb) globalForDb.__taarifaDb = db;
