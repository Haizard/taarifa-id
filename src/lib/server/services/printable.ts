import { eq } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';

const VALID_FIELDS = new Set([
  'first_name',
  'last_name',
  'gender',
  'birthdate',
  'nationality',
  'fluent_language',
  'blood_group',
  'region',
  'district',
  'ward',
]);

export async function getFields(accountId: string) {
  const row = await db.query.printableCards.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  return { included_fields: row?.included_fields ?? [] };
}

export async function setFields(accountId: string, body: { included_fields?: unknown }) {
  const raw = Array.isArray(body?.included_fields) ? body.included_fields : [];
  const included: string[] = [];
  for (const f of raw) {
    if (typeof f === 'string' && VALID_FIELDS.has(f) && !included.includes(f)) included.push(f);
  }

  const existing = await db.query.printableCards.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  if (existing) {
    await db
      .update(schema.printableCards)
      .set({ included_fields: included, generated_at: new Date() })
      .where(eq(schema.printableCards.account_id, accountId));
  } else {
    await db.insert(schema.printableCards).values({ account_id: accountId, included_fields: included });
  }
  return { included_fields: included };
}
