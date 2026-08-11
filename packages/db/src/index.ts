import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { createPoolConfig, databaseUrl } from './env.js';

export * from './schema/index.js';
export { createPoolConfig, databaseUrl, migrationDatabaseUrl } from './env.js';

export const connectionUrl = databaseUrl;

export const pool = new Pool(createPoolConfig(connectionUrl));

export const db = drizzle(pool, { schema });

export default db;
