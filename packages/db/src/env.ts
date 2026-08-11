import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import type { PoolConfig } from 'pg';

/** Load the nearest project .env, regardless of which workspace starts Node. */
function loadProjectEnv() {
  let directory = process.cwd();

  while (true) {
    const envPath = resolve(directory, '.env');
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath });
      return;
    }

    const parent = dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

loadProjectEnv();

const localFallback = 'postgresql://taarifa:taarifa_dev_2026@localhost:5432/taarifa_id';

function withCurrentSupabasePassword(connectionString: string) {
  if (!process.env.supabase_db_password || !usesSupabase(connectionString)) {
    return connectionString;
  }

  try {
    const url = new URL(connectionString);
    url.password = process.env.supabase_db_password;
    return url.toString();
  } catch {
    return connectionString;
  }
}

/**
 * Runtime connections favour Supabase's session pooler. DATABASE_URL remains
 * the explicit override for local development and other Postgres providers.
 */
export const databaseUrl = withCurrentSupabasePassword(
  process.env.DATABASE_URL ??
    process.env.supabase_session_pooler ??
    process.env.supabase_transaction_pooler ??
    process.env.supabase_direct_connection_string ??
    localFallback,
);

/** Schema commands use the session pooler, which works on IPv4-only networks. */
export const migrationDatabaseUrl = withCurrentSupabasePassword(
  process.env.DATABASE_URL ??
    process.env.supabase_session_pooler ??
    process.env.supabase_transaction_pooler ??
    process.env.supabase_direct_connection_string ??
    localFallback,
);

function usesSupabase(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.supabase.co') || host.endsWith('.pooler.supabase.com');
  } catch {
    return false;
  }
}

export function createPoolConfig(connectionString = databaseUrl): PoolConfig {
  const ssl = process.env.DATABASE_SSL === 'true' || usesSupabase(connectionString);
  return {
    connectionString,
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
