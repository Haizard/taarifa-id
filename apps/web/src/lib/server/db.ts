import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createPoolConfig, databaseUrl } from '@taarifa/db';
import * as schema from '@taarifa/db/schema';

type DbSchema = typeof schema;

const globalForDb = globalThis as unknown as {
  __taarifaPool?: Pool;
  __taarifaDb?: NodePgDatabase<DbSchema>;
};

export const pool: Pool =
  globalForDb.__taarifaPool ??
  new Pool({
    ...createPoolConfig(databaseUrl),
    max: Number(process.env.PG_MAX_CONNECTIONS ?? 1),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
export const db: NodePgDatabase<DbSchema> =
  globalForDb.__taarifaDb ?? drizzle(pool, { schema });

if (!globalForDb.__taarifaPool) globalForDb.__taarifaPool = pool;
if (!globalForDb.__taarifaDb) globalForDb.__taarifaDb = db;
