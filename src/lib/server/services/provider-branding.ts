import { inArray } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';

/** Resolves the organization logo fields already stored on legacy entity profiles. */
export async function getOrganizationLogos(accountIds: string[]) {
  const ids = [...new Set(accountIds)];
  const logos = new Map<string, string | null>();
  if (!ids.length) return logos;
  const [businesses, schools, institutions] = await Promise.all([
    db.select({ account_id: schema.businesses.account_id, logo: schema.businesses.business_logo_url }).from(schema.businesses).where(inArray(schema.businesses.account_id, ids)),
    db.select({ account_id: schema.schools.account_id, logo: schema.schools.school_logo_url }).from(schema.schools).where(inArray(schema.schools.account_id, ids)),
    db.select({ account_id: schema.institutions.account_id, logo: schema.institutions.institution_logo_url }).from(schema.institutions).where(inArray(schema.institutions.account_id, ids)),
  ]);
  for (const row of [...businesses, ...schools, ...institutions]) logos.set(row.account_id, row.logo);
  return logos;
}
