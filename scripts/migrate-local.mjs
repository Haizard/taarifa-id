import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { migrationDatabaseUrl, createPoolConfig } = require('@taarifa/db');
const host = new URL(migrationDatabaseUrl).hostname;
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(`Refusing to run local migrations outside loopback PostgreSQL (configured host: ${host}).`);
}

const { Pool } = require('pg');
const pool = new Pool({ ...createPoolConfig(migrationDatabaseUrl), max: 1, connectionTimeoutMillis: 5000 });
try {
  const migrationPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/db/migrations/0020_private_health_details_and_profile_assets.sql');
  await pool.query(await readFile(migrationPath, 'utf8'));
  process.stdout.write(`Applied private health detail and profile asset migration to local PostgreSQL (${host}).\n`);
} finally {
  await pool.end();
}
