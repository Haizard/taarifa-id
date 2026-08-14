import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createPoolConfig, databaseUrl } from '@taarifa/db';
import * as schema from '@taarifa/db';

const username = process.env.ADMIN_USERNAME ?? 'systemadmin';
const password = process.env.ADMIN_PASSWORD ?? 'admin1234';
const mobile = process.env.ADMIN_MOBILE ?? '255700000000';
const firstName = process.env.ADMIN_FIRST_NAME ?? 'System';
const lastName = process.env.ADMIN_LAST_NAME ?? 'Administrator';
const gender = (process.env.ADMIN_GENDER ?? 'Male') as 'Male' | 'Female';

const pool = new Pool(createPoolConfig(databaseUrl));

const db = drizzle(pool, { schema });

async function main() {
  const existing = await db.query.accounts.findFirst({
    where: (t, { eq }) => eq(t.username, username),
  });
  if (existing) {
    const hasSelf = await db.query.personProfiles.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.owner_account_id, existing.id), eq(t.member_type, 'self')),
    });
    if (!hasSelf) {
      // Backfill: legacy admin accounts created before this script inserted a
      // person_profile row can self-bootstrap one so they stop 404-ing on save.
      await db.insert(schema.personProfiles).values({
        owner_account_id: existing.id,
        member_type: 'self',
        profile_code: existing.profile_id,
        first_name: firstName,
        last_name: lastName,
        gender,
        birthdate: new Date('1970-01-01'),
        nationality: 'Tanzanian',
      });
      console.log(`Backfilled self profile for existing admin '${username}'`);
    } else {
      console.log(`System admin '${username}' already exists (${existing.profile_id})`);
    }
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const profileId = `TID-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;

  const acc = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(schema.accounts)
      .values({
        account_type: 'individual',
        role: 'system_admin',
        profile_id: profileId,
        username,
        password_hash: hash,
        mobile_number: mobile,
        status: 'active',
        is_reseller: false,
        never_expires: true,
        first_login_at: new Date(),
      })
      .returning();

    await tx.insert(schema.personProfiles).values({
      owner_account_id: inserted.id,
      member_type: 'self',
      profile_code: profileId,
      first_name: firstName,
      last_name: lastName,
      gender,
      birthdate: new Date('1970-01-01'),
      nationality: 'Tanzanian',
    });

    await tx.insert(schema.profileStatus).values({ account_id: inserted.id, status: 'active' });

    return inserted;
  });

  console.log(`Created system admin '${username}' with profile ${acc.profile_id}`);
  console.log('Login:', username, ' / Password:', password);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
