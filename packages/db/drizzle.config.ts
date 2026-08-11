import { defineConfig } from 'drizzle-kit';
import { migrationDatabaseUrl } from './src/env';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: migrationDatabaseUrl,
  },
});
