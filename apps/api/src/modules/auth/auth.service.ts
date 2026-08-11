import { ConflictException, Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { and, eq, isNull, lt, gte } from 'drizzle-orm';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';
import { RegisterDto, FirstLoginDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './auth.dto';
import { profileId, otpCode } from '../../common/generators';

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DbService,
    private readonly jwt: JwtService,
  ) {}

  private get db() {
    return this.dbService.db;
  }

  private hash(pw: string) {
    return bcrypt.hash(pw, 10);
  }

  async register(dto: RegisterDto) {
    const exists = await this.db.query.accounts.findFirst({
      where: (t, { or }) => or(eq(t.mobile_number, dto.mobile_number)),
    });
    if (exists) throw new ConflictException('Mobile number already registered');

    const isReseller = dto.account_type !== 'individual';
    const role = dto.account_type === 'individual' ? 'individual' : 'admin';
    const pid = profileId();
    const passwordHash = await this.hash(dto.password);

    const now = new Date();
    const account = await this.db.transaction(async (tx) => {
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
      return acc;
    });

    // create self person profile
    await this.db.insert(schema.personProfiles).values({
      owner_account_id: account.id,
      member_type: 'self',
      profile_code: pid,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      last_name: dto.last_name,
      gender: dto.gender,
      birthdate: new Date(dto.birthdate),
      nationality: dto.nationality,
      nida_number: dto.nationality === 'Tanzanian' ? dto.nida_number ?? null : null,
      passport_number: dto.nationality === 'Foreign' ? dto.passport_number ?? null : null,
    });

    // create profile_status (default expired)
    await this.db.insert(schema.profileStatus).values({
      account_id: account.id,
      status: 'expired',
    });

    const code = otpCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await this.db.insert(schema.authCodes).values({
      account_id: account.id,
      otp_code: code,
      purpose: 'first_login',
      expires_at: expires,
    });

    return {
      profile_id: pid,
      message: 'Account created. SMS confirmation code sent.',
      sms_code_dev: code,
      first_login_required: true,
    };
  }

  async firstLogin(dto: FirstLoginDto) {
    const account = await this.db.query.accounts.findFirst({
      where: (t, { and }) => and(eq(t.mobile_number, dto.mobile_number), eq(t.profile_id, dto.profile_id)),
    });
    if (!account) throw new NotFoundException('Account not found');

    const code = await this.db.query.authCodes.findFirst({
      where: (t, { and, eq, isNull }) =>
        and(
          eq(t.account_id, account.id),
          eq(t.otp_code, dto.otp_code),
          eq(t.purpose, 'first_login'),
          isNull(t.used_at),
          gte(t.expires_at, new Date()),
        ),
    });
    if (!code) throw new UnauthorizedException('Invalid or expired code');

    await this.db
      .update(schema.authCodes)
      .set({ used_at: new Date() })
      .where(eq(schema.authCodes.id, code.id));
    await this.db
      .update(schema.accounts)
      .set({ status: 'active', first_login_at: new Date() })
      .where(eq(schema.accounts.id, account.id));

    return this.issueTokens(account);
  }

  async login(dto: LoginDto) {
    const account = await this.db.query.accounts.findFirst({
      where: (t, { eq, or }) => or(eq(t.username, dto.username), eq(t.mobile_number, dto.username)),
    });
    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.status === 'locked') throw new UnauthorizedException('Account locked');
    const ok = await bcrypt.compare(dto.password, account.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    if (!account.first_login_at) {
      // First login: allow password OR require SMS code — but spec says first login uses SMS code.
      throw new UnauthorizedException('First login requires SMS confirmation code');
    }
    await this.db.update(schema.accounts).set({ status: 'active' }).where(eq(schema.accounts.id, account.id));
    return this.issueTokens(account);
  }

  async refresh(refresh_token: string) {
    const session = await this.db.query.sessions.findFirst({
      where: (t, { and, eq, isNull, gte }) =>
        and(eq(t.refresh_token, refresh_token), isNull(t.revoked_at), gte(t.expires_at, new Date())),
    });
    if (!session) throw new UnauthorizedException('Invalid refresh token');
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, session.account_id) });
    if (!account) throw new UnauthorizedException('Account not found');
    return this.issueTokens(account, session.id);
  }

  async logout(refresh_token: string) {
    await this.db.update(schema.sessions).set({ revoked_at: new Date() }).where(eq(schema.sessions.refresh_token, refresh_token));
    return { message: 'Logged out' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const account = await this.db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.mobile_number, dto.mobile_number),
    });
    if (!account) throw new NotFoundException('Account not found');

    const code = otpCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await this.db.insert(schema.authCodes).values({
      account_id: account.id,
      otp_code: code,
      purpose: 'password_reset',
      expires_at: expires,
    });
    return { message: 'Reset code sent via SMS', sms_code_dev: code };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const account = await this.db.query.accounts.findFirst({
      where: (t, { eq }) => eq(t.mobile_number, dto.mobile_number),
    });
    if (!account) throw new NotFoundException('Account not found');

    const code = await this.db.query.authCodes.findFirst({
      where: (t, { and, eq, isNull, gte }) =>
        and(
          eq(t.account_id, account.id),
          eq(t.otp_code, dto.otp_code),
          eq(t.purpose, 'password_reset'),
          isNull(t.used_at),
          gte(t.expires_at, new Date()),
        ),
    });
    if (!code) throw new UnauthorizedException('Invalid or expired code');

    const hash = await this.hash(dto.new_password);
    await this.db.update(schema.accounts).set({ password_hash: hash }).where(eq(schema.accounts.id, account.id));
    await this.db.update(schema.authCodes).set({ used_at: new Date() }).where(eq(schema.authCodes.id, code.id));
    return { message: 'Password reset successfully' };
  }

  async changePassword(accountId: string, dto: ChangePasswordDto) {
    const account = await this.db.query.accounts.findFirst({ where: (t, { eq }) => eq(t.id, accountId) });
    if (!account) throw new NotFoundException('Account not found');
    const ok = await bcrypt.compare(dto.old_password, account.password_hash);
    if (!ok) throw new BadRequestException('Old password incorrect');
    const hash = await this.hash(dto.new_password);
    await this.db.update(schema.accounts).set({ password_hash: hash }).where(eq(schema.accounts.id, accountId));
    return { message: 'Password changed' };
  }

  private async issueTokens(account: any, revokeSessionId?: string) {
    const payload = {
      sub: account.id,
      username: account.username,
      role: account.role,
      account_type: account.account_type,
      profile_id: account.profile_id,
      mobile_number: account.mobile_number,
    };
    const access_token = this.jwt.sign(payload, { secret: process.env.JWT_SECRET ?? 'dev_secret', expiresIn: '15m' });
    const refresh_token = this.jwt.sign({ sub: account.id }, { secret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh', expiresIn: '30d' });

    if (revokeSessionId) {
      await this.db.update(schema.sessions).set({ revoked_at: new Date() }).where(eq(schema.sessions.id, revokeSessionId));
    }
    await this.db.insert(schema.sessions).values({
      account_id: account.id,
      refresh_token,
      device: 'web',
      expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    });

    return { access_token, refresh_token, user: { ...payload } };
  }
}
