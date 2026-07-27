import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "fallback-secret-change-me";
const EXPIRES_IN = "7d";

export interface JWTPayload {
  id: string;
  name: string;
  role: string;
  profileId: string;
  accountType: string;
  isAccountActive: boolean;
  isFirstLogin: boolean;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}
