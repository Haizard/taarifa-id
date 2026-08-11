import { eq, and, desc } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { notFound } from '../errors';
import { send } from './sms';
import type { CreatePaymentDto } from '../dto';

export async function create(accountId: string, dto: CreatePaymentDto) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');

  const [payment] = await db
    .insert(schema.payments)
    .values({
      account_id: accountId,
      amount: dto.amount.toString(),
      method: dto.method,
      duration_months: dto.duration_months,
      provider_reference: `MOCK-${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
      status: 'pending',
    })
    .returning();

  // Mock payment gateway: confirm inline (serverless-safe; no setTimeout).
  const confirmed = await confirmMock(payment.id);
  return confirmed ?? payment;
}

async function confirmMock(paymentId: string) {
  const payment = await db.query.payments.findFirst({ where: (t, { eq }) => eq(t.id, paymentId) });
  if (!payment || payment.status !== 'pending') return null;
  const [updated] = await db.update(schema.payments).set({ status: 'success' }).where(eq(schema.payments.id, paymentId)).returning();
  await activate(payment.account_id, payment.amount.toString(), payment.duration_months, 'auto');
  return updated;
}

export async function activate(accountId: string, amount: string, durationMonths: number, activatedBy: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');

  const paid = new Date();
  const expire = new Date(paid);
  expire.setMonth(expire.getMonth() + durationMonths);

  const existing = await db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  if (existing) {
    await db.update(schema.profileStatus)
      .set({ paid_amount: amount, paid_date: paid, expire_date: expire, status: 'active' })
      .where(eq(schema.profileStatus.id, existing.id));
  } else {
    await db.insert(schema.profileStatus).values({ account_id: accountId, paid_amount: amount, paid_date: paid, expire_date: expire, status: 'active' });
  }
  await db.update(schema.accounts).set({ status: 'active' }).where(eq(schema.accounts.id, accountId));
  await db.update(schema.payments).set({ status: 'success', activated_by: activatedBy }).where(eq(schema.payments.account_id, accountId));

  if (account.mobile_number) {
    await send(accountId, 'reminder', { profile_id: account.profile_id }, account.mobile_number);
  }
  return { message: 'Profile activated', expire_date: expire };
}

export async function getHistory(accountId: string) {
  return db.query.payments.findMany({
    where: (t, { eq }) => eq(t.account_id, accountId),
    orderBy: (t, { desc }) => [desc(t.created_at)],
  });
}

export async function getStatus(accountId: string) {
  return db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
}

export async function getByProfileId(profileId: string) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.profile_id, profileId) });
  if (!account) throw notFound('Profile not found');
  const status = await db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
  return { account_id: account.id, profile_id: account.profile_id, status };
}

export async function listAll() {
  return db.query.payments.findMany({
    orderBy: (t, { desc }) => [desc(t.created_at)],
    with: { account: { columns: { profile_id: true, username: true } } },
  });
}
