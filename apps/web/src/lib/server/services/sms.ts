import * as schema from '@taarifa/db/schema';
import { db } from '../db';

type SmsType = typeof schema.smsTypeEnum.enumValues[number];

function renderMessage(type: SmsType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'otp':
      return `TAARIFA_ID: Your confirmation code is ${payload.code}. Valid for 15 minutes.`;
    case 'reminder':
      return `TAARIFA_ID: Your profile ${payload.profile_id} is due for renewal. Please renew to stay active.`;
    case 'alert':
      return `TAARIFA_ID: Profile ${payload.profile_id} has expired. Renew now to reactivate your ID.`;
    default:
      return 'TAARIFA_ID message';
  }
}

export async function send(
  accountId: string | null,
  type: SmsType,
  payload: Record<string, unknown>,
  to?: string,
) {
  const message = renderMessage(type, payload);
  console.log(`[MOCK SMS -> ${to ?? 'n/a'}] ${message}`);
  await db.insert(schema.smsLogs).values({
    account_id: accountId,
    type,
    payload: { ...payload, to, message },
    status: 'sent',
  });
  return { delivered: true, message };
}

export async function sendOtp(accountId: string, mobile: string, code: string) {
  return send(accountId, 'otp', { code }, mobile);
}

export async function sendRenewalReminder(accountId: string, mobile: string, profileId: string) {
  return send(accountId, 'reminder', { profile_id: profileId }, mobile);
}

export async function sendExpiryAlert(accountId: string, mobile: string, profileId: string) {
  return send(accountId, 'alert', { profile_id: profileId }, mobile);
}

export async function getLogs(accountId?: string) {
  if (!accountId) return db.query.smsLogs.findMany({ orderBy: (t, { desc }) => [desc(t.sent_at)] });
  return db.query.smsLogs.findMany({
    where: (t, { eq }) => eq(t.account_id, accountId),
    orderBy: (t, { desc }) => [desc(t.sent_at)],
  });
}
