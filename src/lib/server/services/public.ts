import { eq, sql } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { notFound } from '../errors';
import { generate } from './qrcode';

export interface PublicRequestInfo {
  baseUrl: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
}

export async function stats() {
  const count = async (col: typeof schema.accountTypeEnum.enumValues[number]) => {
    const r = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.accounts)
      .where(eq(schema.accounts.account_type, col));
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

export async function resolveByProfileId(profileId: string, req: PublicRequestInfo) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.profile_id, profileId) });
  if (!account) throw notFound('Profile not found');

  await db.insert(schema.urlAccessLogs).values({
    account_id: account.id,
    url: `${req.baseUrl}${req.path}`,
    ip: req.ip,
    user_agent: req.userAgent,
  });

  const status = await db.query.profileStatus.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });

  const expired =
    status?.status === 'expired' ||
    (status?.expire_date ? new Date(status.expire_date) < new Date() : true);

  if (expired) {
    const qr = await generate(`${req.baseUrl}/renew/${profileId}`);
    return {
      profile_id: profileId,
      expired: true,
      renewal_url: `/renew/${profileId}`,
      qr_data_url: qr,
      message: 'This profile has expired. Please renew to view.',
    };
  }

  const profiles = await db.query.personProfiles.findMany({
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

  const overrides = await db.query.fieldVisibilityOverrides.findMany({ where: (t, { eq }) => eq(t.account_id, account.id) });
  const overrideMap = new Map(overrides.map((o) => [o.field_visibility_id, o.is_public]));

  const visibility = await db.query.fieldVisibility.findMany({ where: (t, { eq }) => eq(t.account_type, account.account_type) });
  const visibilityMap = new Map(visibility.map((v) => [`${v.entity_name}:${v.field_name}`, v]));

  const filteredProfiles = profiles.map((p) => applyVisibility(p, visibilityMap, overrideMap));

  const entity = await getEntityPublic(account);

  return {
    profile_id: account.profile_id,
    account_type: account.account_type,
    is_reseller: account.is_reseller,
    expired: false,
    profiles: filteredProfiles,
    entity,
    qr_data_url: await generate(`${req.baseUrl}/profile/${profileId}`),
  };
}

async function getEntityPublic(account: any) {
  switch (account.account_type) {
    case 'family': return db.query.families.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
    case 'school': return db.query.schools.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
    case 'business': return db.query.businesses.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
    case 'institution': return db.query.institutions.findFirst({ where: (t, { eq }) => eq(t.account_id, account.id) });
    default: return null;
  }
}

function applyVisibility(profile: any, visMap: Map<string, any>, overrideMap: Map<string, boolean>) {
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
