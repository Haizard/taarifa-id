import { Injectable } from '@nestjs/common';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';

@Injectable()
export class SmsService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  // Mock SMS adapter — logs to DB, prints to console in dev.
  async send(accountId: string | null, type: typeof schema.smsTypeEnum.enumValues[number], payload: Record<string, unknown>, to?: string) {
    const message = this.renderMessage(type, payload);
    console.log(`[MOCK SMS -> ${to ?? 'n/a'}] ${message}`);
    await this.db.insert(schema.smsLogs).values({
      account_id: accountId,
      type,
      payload: { ...payload, to, message },
      status: 'sent',
    });
    return { delivered: true, message };
  }

  async sendOtp(accountId: string, mobile: string, code: string) {
    return this.send(accountId, 'otp', { code }, mobile);
  }

  async sendRenewalReminder(accountId: string, mobile: string, profileId: string) {
    return this.send(accountId, 'reminder', { profile_id: profileId }, mobile);
  }

  async sendExpiryAlert(accountId: string, mobile: string, profileId: string) {
    return this.send(accountId, 'alert', { profile_id: profileId }, mobile);
  }

  private renderMessage(type: typeof schema.smsTypeEnum.enumValues[number], payload: Record<string, unknown>): string {
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

  async getLogs(accountId?: string) {
    if (!accountId) return this.db.query.smsLogs.findMany({ orderBy: (t, { desc }) => [desc(t.sent_at)] });
    return this.db.query.smsLogs.findMany({
      where: (t, { eq }) => eq(t.account_id, accountId),
      orderBy: (t, { desc }) => [desc(t.sent_at)],
    });
  }
}
