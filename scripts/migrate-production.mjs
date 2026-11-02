import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping production database migration outside the Vercel production environment.');
  process.exit(0);
}

const connectionString = process.env.DATABASE_URL
  ?? process.env.supabase_session_pooler
  ?? process.env.supabase_transaction_pooler
  ?? process.env.supabase_direct_connection_string;

if (!connectionString) {
  throw new Error('Vercel production is missing its PostgreSQL connection string.');
}

const databaseHost = new URL(connectionString).hostname;
if (['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
  throw new Error('Refusing to run a production migration against a local database URL.');
}

const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const isSupabase = databaseHost.endsWith('.supabase.co') || databaseHost.endsWith('.pooler.supabase.com');
const pool = new Pool({
  connectionString,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 1,
  connectionTimeoutMillis: 10_000,
});

const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/db/migrations');
try {
  for (const filename of ['0001_service_marketplace.sql', '0002_service_reviews.sql', '0003_service_assignments.sql', '0004_service_worker_reviews.sql', '0005_provider_review_moderation.sql', '0006_career_portability.sql', '0007_job_discovery.sql', '0008_job_messages.sql']) {
    await pool.query(await readFile(path.join(migrationsDirectory, filename), 'utf8'));
    console.log(`Applied ${filename}.`);
  }
} finally {
  await pool.end();
}
