import * as bcrypt from 'bcryptjs';
import { eq, and, isNull, gte, or } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { conflict, notFound, unauthorized, badRequest } from '../errors';
import { signAccessToken, signRefreshToken, type JwtUser } from '../jwt';
import { profileId, otpCode } from '../generators';
import type { RegisterDto, FirstLoginDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from '../dto';

const MAX_PHOTO_BYTES = 1024 * 1024; // 1MB

export function validatePhoto(dataUrl?: string): string | null {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw badRequest('Invalid photo format');
  const decoded = Buffer.from(match[2], 'base64');
  if (decoded.length > MAX_PHOTO_BYTES) throw badRequest('Photo must not exceed 1MB');
  return dataUrl;
}

const hash = (pw: string) => bcrypt.hash(pw, 10);

export async function register(dto: RegisterDto) {
  const photo = validatePhoto(dto.pic_url);
  if (!photo) throw badRequest('A profile photo is required (max 1MB)');

  const exists = await db.query.accounts.findFirst({
    where: (t, { or }) => or(eq(t.mobile_number, dto.mobile_number)),
  });
  if (exists) throw conflict('Mobile number already registered');

  const isReseller = dto.account_type !== 'individual';
  const role = dto.account_type === 'individual' ? 'individual' : 'admin';
  const pid = profileId();
  const passwordHash = await hash(dto.password);

  // Account + profile + status + first-login code all live in one transaction so
  // a failure on the profile insert can never leave us with a loginable but
  // profile-less orphan account.
  const { account, code } = await db.transaction(async (tx) => {
    const [acc] = await tx
      .insert(schema.accounts)
      .values({
        account_type: dto.account_type,
        role,
        profile_id: pid,
        username: `user_${pid.replace('TID-', '').toLowerCase()}`,
        password_hash: passwordHash,
        mobile_number: dto.mobile_number,
        email: dto.email ?? null,
        status: 'inactive',
        is_reseller: isReseller,
        never_expires: isReseller,
        first_login_at: null,
      })
      .returning();

    await tx.insert(schema.personProfiles).values({
      owner_account_id: acc.id,
      member_type: 'self',
      profile_code: pid,
      pic_url: photo,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      last_name: dto.last_name,
      gender: dto.gender,
      birthdate: new Date(dto.birthdate),
      nationality: dto.nationality,
      nida_number: dto.nationality === 'Tanzanian' ? dto.nida_number ?? null : null,
      passport_number: dto.nationality === 'Foreign' ? dto.passport_number ?? null : null,
    });

    await tx.insert(schema.profileStatus).values({
      account_id: acc.id,
      status: 'expired',
    });

    const otp = otpCode();
    await tx.insert(schema.authCodes).values({
      account_id: acc.id,
      otp_code: otp,
      purpose: 'first_login',
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    });

    return { account: acc, code: otp };
  });

  return {
    profile_id: pid,
    message: 'Account created. SMS confirmation code sent.',
    sms_code_dev: code,
    first_login_required: true,
  };
}

export async function firstLogin(dto: FirstLoginDto) {
  const account = await db.query.accounts.findFirst({
    where: (t, { and }) => and(eq(t.mobile_number, dto.mobile_number), eq(t.profile_id, dto.profile_id)),
  });
  if (!account) throw notFound('Account not found');

  const code = await db.query.authCodes.findFirst({
    where: (t, { and, eq, isNull, gte }) =>
      and(
        eq(t.account_id, account.id),
        eq(t.otp_code, dto.otp_code),
        eq(t.purpose, 'first_login'),
        isNull(t.used_at),
        gte(t.expires_at, new Date()),
      ),
  });
  if (!code) throw unauthorized('Invalid or expired code');

  await db.update(schema.authCodes).set({ used_at: new Date() }).where(eq(schema.authCodes.id, code.id));
  await db.update(schema.accounts).set({ status: 'active', first_login_at: new Date() }).where(eq(schema.accounts.id, account.id));

  return issueTokens(account);
}

export async function login(dto: LoginDto) {
  const account = await db.query.accounts.findFirst({
    where: (t, { eq, or }) => or(eq(t.username, dto.username), eq(t.mobile_number, dto.username)),
  });
  if (!account) throw unauthorized('Invalid credentials');
  if (account.status === 'locked') throw unauthorized('Account locked');
  const ok = await bcrypt.compare(dto.password, account.password_hash);
  if (!ok) throw unauthorized('Invalid credentials');

  if (!account.first_login_at) {
    throw unauthorized('First login requires SMS confirmation code');
  }
  await db.update(schema.accounts).set({ status: 'active' }).where(eq(schema.accounts.id, account.id));
  return issueTokens(account);
}

export async function refresh(refreshToken: string) {
  const session = await db.query.sessions.findFirst({
    where: (t, { and, eq, isNull, gte }) =>
      and(eq(t.refresh_token, refreshToken), isNull(t.revoked_at), gte(t.expires_at, new Date())),
  });
  if (!session) throw unauthorized('Invalid refresh token');
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, session.account_id) });
  if (!account) throw unauthorized('Account not found');
  return issueTokens(account, session.id);
}

export async function logout(refreshToken: string) {
  await db.update(schema.sessions).set({ revoked_at: new Date() }).where(eq(schema.sessions.refresh_token, refreshToken));
  return { message: 'Logged out' };
}

export async function forgotPassword(dto: ForgotPasswordDto) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.mobile_number, dto.mobile_number) });
  if (!account) throw notFound('Account not found');

  const code = otpCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db.insert(schema.authCodes).values({
    account_id: account.id,
    otp_code: code,
    purpose: 'password_reset',
    expires_at: expires,
  });
  return { message: 'Reset code sent via SMS', sms_code_dev: code };
}

export async function resetPassword(dto: ResetPasswordDto) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.mobile_number, dto.mobile_number) });
  if (!account) throw notFound('Account not found');

  const code = await db.query.authCodes.findFirst({
    where: (t, { and, eq, isNull, gte }) =>
      and(
        eq(t.account_id, account.id),
        eq(t.otp_code, dto.otp_code),
        eq(t.purpose, 'password_reset'),
        isNull(t.used_at),
        gte(t.expires_at, new Date()),
      ),
  });
  if (!code) throw unauthorized('Invalid or expired code');

  const passwordHash = await hash(dto.new_password);
  await db.update(schema.accounts).set({ password_hash: passwordHash }).where(eq(schema.accounts.id, account.id));
  await db.update(schema.authCodes).set({ used_at: new Date() }).where(eq(schema.authCodes.id, code.id));
  return { message: 'Password reset successfully' };
}

export async function changePassword(accountId: string, dto: ChangePasswordDto) {
  const account = await db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
  if (!account) throw notFound('Account not found');
  const ok = await bcrypt.compare(dto.old_password, account.password_hash);
  if (!ok) throw badRequest('Old password incorrect');
  const passwordHash = await hash(dto.new_password);
  await db.update(schema.accounts).set({ password_hash: passwordHash }).where(eq(schema.accounts.id, accountId));
  return { message: 'Password changed' };
}

async function issueTokens(account: any, revokeSessionId?: string) {
  const payload: JwtUser = {
    sub: account.id,
    username: account.username,
    role: account.role,
    account_type: account.account_type,
    profile_id: account.profile_id,
    mobile_number: account.mobile_number,
  };
  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken(account.id);

  if (revokeSessionId) {
    await db.update(schema.sessions).set({ revoked_at: new Date() }).where(eq(schema.sessions.id, revokeSessionId));
  }
  await db.insert(schema.sessions).values({
    account_id: account.id,
    refresh_token,
    device: 'web',
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });

  return { access_token, refresh_token, user: { ...payload } };
}
