import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';
import { QrcodeService } from '../qrcode/qrcode.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly dbService: DbService,
    private readonly qrcode: QrcodeService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  async stats() {
    const count = async (col: any) => {
      const r = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.accounts)
        .where(col ? eq(schema.accounts.account_type, col) : undefined);
      return r[0]?.count ?? 0;
    };
    const [individual, family, school, business, institution] = await Promise.all([
      count('individual'),
      count('family'),
      count('school'),
      count('business'),
      count('institution'),
    ]);
    return { individual, family, school, business, institution, total: individual + family + school + business + institution };
  }

  async resolveByProfileId(profileId: string, req: any) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.profile_id, profileId) });
    if (!account) throw new NotFoundException('Profile not found');

    // Log URL access
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    await this.db.insert(schema.urlAccessLogs).values({
      account_id: account.id,
      url: `${baseUrl}${req.originalUrl}`,
      ip: req.ip ?? null,
      user_agent: req.get('user-agent') ?? null,
    });

    const status = await this.db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });

    const expired =
      status?.status === 'expired' ||
      (status?.expire_date ? new Date(status.expire_date) < new Date() : true);

    // If expired, redirect hint to renewal
    if (expired) {
      const qr = await this.qrcode.generate(`${baseUrl}/renew/${profileId}`);
      return {
        profile_id: profileId,
        expired: true,
        renewal_url: `/renew/${profileId}`,
        qr_data_url: qr,
        message: 'This profile has expired. Please renew to view.',
      };
    }

    const profiles = await this.db.query.personProfiles.findMany({
      where: (t, { eq }) => eq(t.owner_account_id, account.id),
      with: {
        mobileNumbers: true,
        health: true,
        residence: true,
        emergencyContacts: true,
        desperateConditions: true,
        employment: { with: { employers: true, supervisors: true } },
      },
    });

    // Apply field-visibility rules: no flag = public; PU may be hidden via overrides; P = optional print
    const overrides = await this.db.query.fieldVisibilityOverrides.findMany({ where: (t, { eq }) => eq(t.account_id, account.id) });
    const overrideMap = new Map(overrides.map((o) => [o.field_visibility_id, o.is_public]));

    const visibility = await this.db.query.fieldVisibility.findMany({ where: (t, { eq }) => eq(t.account_type, account.account_type) });
    const visibilityMap = new Map(visibility.map((v) => [`${v.entity_name}:${v.field_name}`, v]));

    const filteredProfiles = profiles.map((p) => this.applyVisibility(p, visibilityMap, overrideMap));

    const entity = await this.getEntityPublic(account);

    return {
      profile_id: account.profile_id,
      account_type: account.account_type,
      is_reseller: account.is_reseller,
      expired: false,
      profiles: filteredProfiles,
      entity,
      qr_data_url: await this.qrcode.generate(`${baseUrl}/profile/${profileId}`),
    };
  }

  private async getEntityPublic(account: any) {
    switch (account.account_type) {
      case 'family': return this.db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      case 'school': return this.db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      case 'business': return this.db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      case 'institution': return this.db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
      default: return null;
    }
  }

  private applyVisibility(profile: any, visMap: Map<string, any>, overrideMap: Map<string, boolean>) {
    const isPublic = (entity: string, field: string, value: any) => {
      if (value === null || value === undefined) return;
      const entry = visMap.get(`${entity}:${field}`);
      if (!entry || entry.flag === 'none') return { key: field, value, public: true };
      if (entry.flag === 'PU' || entry.flag === 'PU_P') {
        const visible = overrideMap.get(entry.id) ?? true;
        return { key: field, value, public: visible };
      }
      return { key: field, value, public: true };
    };

    const allowedKeys = new Set([
      'first_name', 'last_name', 'gender', 'birthdate', 'nationality', 'fluent_language',
    ]);
    const publicProfile: Record<string, any> = { id: profile.id, member_type: profile.member_type };
    for (const key of allowedKeys) {
      const check = isPublic('basic_details', key, profile[key]);
      if (check) publicProfile[key] = check.value;
    }

    if (profile.health) {
      const health: Record<string, any> = {};
      for (const k of ['blood_group', 'height', 'weight']) {
        const check = isPublic('basic_health', k, profile.health[k]);
        if (check) health[k] = check.value;
      }
      if (Object.keys(health).length) publicProfile.health = health;
    }

    if (profile.residence) {
      const res: Record<string, any> = {};
      for (const k of ['region', 'district', 'ward', 'street', 'local_authority_name']) {
        const check = isPublic('residence', k, profile.residence[k]);
        if (check) res[k] = check.value;
      }
      if (Object.keys(res).length) publicProfile.residence = res;
    }

    if (profile.emergencyContacts?.length) {
      publicProfile.emergency_contacts = profile.emergencyContacts.map((c: any) => {
        const out: Record<string, any> = {};
        for (const k of ['full_name', 'mobile_1', 'mobile_2', 'relation_type']) {
          const check = isPublic('emergency_contacts', k, c[k]);
          if (check) out[k] = check.value;
        }
        return out;
      });
    }

    if (profile.employment) {
      const check = isPublic('employment', 'employment_type', profile.employment.employment_type);
      if (check) publicProfile.employment = { employment_type: check.value };
    }

    return publicProfile;
  }
}
