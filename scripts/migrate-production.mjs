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

const require = createRequire(import.meta.url);
// Use the same URL/password override and SSL rules as the application and Drizzle.
// Supabase password rotations are supplied separately as `supabase_db_password`.
const { migrationDatabaseUrl, createPoolConfig } = require('@taarifa/db');
const effectiveConnectionString = migrationDatabaseUrl;
const databaseHost = new URL(effectiveConnectionString).hostname;
if (['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
  throw new Error('Refusing to run a production migration against a local database URL.');
}

const { Pool } = require('pg');
const pool = new Pool({
  ...createPoolConfig(effectiveConnectionString),
  max: 1,
  connectionTimeoutMillis: 10_000,
});

const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/db/migrations');
try {
  for (const filename of ['0001_service_marketplace.sql', '0002_service_reviews.sql', '0003_service_assignments.sql', '0004_service_worker_reviews.sql', '0005_provider_review_moderation.sql', '0006_career_portability.sql', '0007_job_discovery.sql', '0008_job_messages.sql', '0009_job_invitations.sql', '0010_job_safety_actions.sql', '0011_provider_verification.sql', '0012_revoke_minor_career_shares.sql', '0013_two_sided_hire_confirmation.sql', '0014_provider_verification_evidence.sql']) {
    try {
      await pool.query(await readFile(path.join(migrationsDirectory, filename), 'utf8'));
    } catch (error) {
      if (error?.code === '28P01') {
        throw new Error('Supabase rejected the migration credentials. Confirm the Vercel Production PostgreSQL URL and `supabase_db_password` match the Supabase project.', { cause: error });
      }
      throw error;
    }
    console.log(`Applied ${filename}.`);
  }
} finally {
  await pool.end();
}
