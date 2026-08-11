import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';
import { PaymentsService } from '../payments/payments.service';
import { ActivateAccountDto } from './system-admin.dto';

@Injectable()
export class SystemAdminService {
  constructor(
    private readonly dbService: DbService,
    private readonly payments: PaymentsService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  async dashboard() {
    const [totalAccounts, individual, family, school, business, institution, active, expired, paymentsToday, urlAccesses] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'individual')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'family')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'school')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'business')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.account_type, 'institution')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.accounts).where(eq(schema.accounts.status, 'active')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.profileStatus).where(eq(schema.profileStatus.status, 'expired')).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.payments).where(sql`created_at::date = current_date`).then((r) => r[0]?.count ?? 0),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.urlAccessLogs).then((r) => r[0]?.count ?? 0),
    ]);

    return {
      counts: { totalAccounts, individual, family, school, business, institution, active, expired },
      paymentsToday,
      urlAccesses,
    };
  }

  async listAccounts(filter?: string) {
    const rows = await this.db.query.accounts.findMany({
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

  async activateByProfileId(dto: ActivateAccountDto) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.profile_id, dto.profile_id) });
    if (!account) throw new NotFoundException('Account not found for that Profile ID');
    const activation = await this.payments.activate(account.id, dto.amount.toString(), dto.duration_months, dto.activated_by ?? 'system_admin');
    await this.db.insert(schema.systemAdminLogs).values({
      actor_account_id: dto.actor_account_id ?? null,
      action: 'activate_account',
      target_account_id: account.id,
      payload: { profile_id: dto.profile_id, amount: dto.amount, duration_months: dto.duration_months },
    });
    return activation;
  }

  async listPayments() {
    return this.payments.listAll();
  }

  async listUsers() {
    return this.db.query.accounts.findMany({
      where: (t, { eq }) => eq(t.role, 'user'),
      with: { parentAccount: true, personProfiles: true },
    });
  }

  async urlAccessReport() {
    const rows = await this.db.query.urlAccessLogs.findMany({ orderBy: (t, { desc }) => [desc(t.accessed_at)] });
    const byUrl = new Map<string, number>();
    for (const r of rows) byUrl.set(r.url, (byUrl.get(r.url) ?? 0) + 1);
    return { total: rows.length, by_url: Array.from(byUrl.entries()).map(([url, count]) => ({ url, count })) };
  }

  async createLookup(table: string, code: string, label: string) {
    const map: Record<string, any> = {
      acute: schema.lovAcuteConditions,
      employment: schema.lovEmploymentTypes,
      position: schema.lovPositions,
      stream: schema.lovSchoolStreams,
      ownership: schema.lovOwnershipTypes,
    };
    const tableRef = map[table];
    if (!tableRef) throw new NotFoundException('Unknown lookup table');
    return this.db.insert(tableRef).values({ code, label }).returning();
  }

  async listLogs() {
    return this.db.query.systemAdminLogs.findMany({ orderBy: (t, { desc }) => [desc(t.created_at)] });
  }
}
