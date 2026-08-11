import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPoolConfig, databaseUrl, * as schema } from '@taarifa/db';

const username = process.env.ADMIN_USERNAME ?? 'systemadmin';
const password = process.env.ADMIN_PASSWORD ?? 'admin1234';
const mobile = process.env.ADMIN_MOBILE ?? '255700000000';

const pool = new Pool(createPoolConfig(databaseUrl));

const db = drizzle(pool, { schema });

async function main() {
  const existing = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.username, username),
  });
  if (existing) {
    console.log(`System admin '${username}' already exists (${existing.profile_id})`);
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const [acc] = await db
    .insert(schema.accounts)
    .values({
      account_type: 'individual',
      role: 'system_admin',
      profile_id: `TID-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
      username,
      password_hash: hash,
      mobile_number: mobile,
      status: 'active',
      is_reseller: false,
      never_expires: true,
      first_login_at: new Date(),
    })
    .returning();

  await db.insert(schema.profileStatus).values({ account_id: acc.id, status: 'active' });

  console.log(`Created system admin '${username}' with profile ${acc.profile_id}`);
  console.log('Login:', username, ' / Password:', password);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
