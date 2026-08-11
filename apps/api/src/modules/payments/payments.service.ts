import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';
import { SmsService } from '../sms/sms.service';
import { CreatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dbService: DbService,
    private readonly sms: SmsService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  async create(accountId: string, dto: CreatePaymentDto) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!account) throw new NotFoundException('Account not found');

    const [payment] = await this.db
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

    // Mock payment gateway: auto-confirm after a moment for dev convenience
    setTimeout(() => this.confirmMock(payment.id).catch(() => undefined), 1500);
    return payment;
  }

  private async confirmMock(paymentId: string) {
    const payment = await this.db.query.payments.findFirst({ where: (t, { eq }) => eq(t.id, paymentId) });
    if (!payment || payment.status !== 'pending') return;
    await this.db.update(schema.payments).set({ status: 'success' }).where(eq(schema.payments.id, paymentId));
    await this.activate(payment.account_id, payment.amount.toString(), payment.duration_months, 'auto');
  }

  async activate(accountId: string, amount: string, durationMonths: number, activatedBy: string) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!account) throw new NotFoundException('Account not found');

    const paid = new Date();
    const expire = new Date(paid);
    expire.setMonth(expire.getMonth() + durationMonths);

    const existing = await this.db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
    if (existing) {
      await this.db
        .update(schema.profileStatus)
        .set({ paid_amount: amount, paid_date: paid, expire_date: expire, status: 'active' })
        .where(eq(schema.profileStatus.id, existing.id));
    } else {
      await this.db.insert(schema.profileStatus).values({ account_id: accountId, paid_amount: amount, paid_date: paid, expire_date: expire, status: 'active' });
    }
    await this.db.update(schema.accounts).set({ status: 'active' }).where(eq(schema.accounts.id, accountId));
    await this.db.update(schema.payments).set({ status: 'success', activated_by: activatedBy }).where(eq(schema.payments.account_id, accountId));

    if (account.mobile_number) {
      await this.sms.send(accountId, 'reminder', { profile_id: account.profile_id }, account.mobile_number);
    }
    return { message: 'Profile activated', expire_date: expire };
  }

  async getHistory(accountId: string) {
    return this.db.query.payments.findMany({
      where: (t, { eq }) => eq(t.account_id, accountId),
      orderBy: (t, { desc }) => [desc(t.created_at)],
    });
  }

  async getStatus(accountId: string) {
    return this.db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, accountId) });
  }

  async getByProfileId(profileId: string) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.profile_id, profileId) });
    if (!account) throw new NotFoundException('Profile not found');
    const status = await this.db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
    return { account_id: account.id, profile_id: account.profile_id, status };
  }

  async listAll() {
    return this.db.query.payments.findMany({
      orderBy: (t, { desc }) => [desc(t.created_at)],
      with: { account: { columns: { profile_id: true, username: true } } },
    });
  }
}
