import jwt from 'jsonwebtoken';

export interface JwtUser {
  sub: string;
  username: string;
  role: string;
  account_type: string;
  profile_id: string;
  mobile_number?: string | null;
}

const accessSecret = () => process.env.JWT_SECRET ?? 'dev_secret';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET ?? 'dev_refresh';

export function signAccessToken(user: JwtUser): string {
  return jwt.sign({ ...user }, accessSecret(), { expiresIn: '15m' });
}

export function signRefreshToken(sub: string): string {
  return jwt.sign({ sub }, refreshSecret(), { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): JwtUser {
  return jwt.verify(token, accessSecret()) as JwtUser;
}
