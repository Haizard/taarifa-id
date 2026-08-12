import { eq, desc, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { notFound } from '../errors';
import { activate, listAll } from './payments';
import type { ActivateAccountDto, CreateLookupDto } from '../dto';

export async function dashboard() {
  const [totalAccounts, individual, family, school, business, institution, active, expired, paymentsToday, urlAccesses] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'individual')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'family')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'school')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'business')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'institution')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.status, 'active')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.profileStatus).where(eq(schema.profileStatus.status, 'expired')).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.payments).where(sql`created_at::date = current_date`).then((r) => r[0]?.count ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.urlAccessLogs).then((r) => r[0]?.count ?? 0),
  ]);

  return {
    counts: { totalAccounts, individual, family, school, business, institution, active, expired },
    paymentsToday,
    urlAccesses,
  };
}

export async function listAccounts(filter?: string) {
  const rows = await db.query.accounts.findMany({
    orderBy: (t, { desc }) => [desc(t.created_at)],
    with: { profileStatus: true },
  });
  if (filter) {
    return rows.filter(
      (a) =>
        a.account_type.includes(filter) ||
        a.status.includes(filter) ||
        a.profile_id.toLowerCase().includes(filter.toLowerCase()) ||
        a.username.toLowerCase().includes(filter.toLowerCase()),
    );
  }
  return rows.map(({ password_hash, ...safe }) => safe);
}

export async function activateByProfileId(dto: ActivateAccountDto) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.profile_id, dto.profile_id) });
  if (!account) throw notFound('Account not found for that Profile ID');
  const activation = await activate(account.id, dto.amount.toString(), dto.duration_months, dto.activated_by ?? 'system_admin');
  await db.insert(schema.systemAdminLogs).values({
    actor_account_id: dto.actor_account_id ?? null,
    action: 'activate_account',
    target_account_id: account.id,
    payload: { profile_id: dto.profile_id, amount: dto.amount, duration_months: dto.duration_months },
  });
  return activation;
}

export async function listPayments() {
  return listAll();
}

export async function listUsers() {
  return db.query.accounts.findMany({
    where: (t, { eq }) => eq(t.role, 'user'),
    with: { parentAccount: true, personProfiles: true },
  });
}

export async function urlAccessReport() {
  const rows = await db.query.urlAccessLogs.findMany({ orderBy: (t, { desc }) => [desc(t.accessed_at)] });
  const byUrl = new Map<string, number>();
  for (const r of rows) byUrl.set(r.url, (byUrl.get(r.url) ?? 0) + 1);
  return { total: rows.length, by_url: Array.from(byUrl.entries()).map(([url, count]) => ({ url, count })) };
}

export async function createLookup(dto: CreateLookupDto) {
  const map: Record<string, any> = {
    acute: schema.lovAcuteConditions,
    employment: schema.lovEmploymentTypes,
    position: schema.lovPositions,
    stream: schema.lovSchoolStreams,
    ownership: schema.lovOwnershipTypes,
  };
  const tableRef = map[dto.table];
  if (!tableRef) throw notFound('Unknown lookup table');
  return db.insert(tableRef).values({ code: dto.code, label: dto.label }).returning();
}

export async function listLogs() {
  return db.query.systemAdminLogs.findMany({ orderBy: (t, { desc }) => [desc(t.created_at)] });
}
