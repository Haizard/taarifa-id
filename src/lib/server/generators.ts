import { customAlphabet } from 'nanoid';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const profileId = () => `TID-${customAlphabet(alphabet, 10)()}`;

// Per-member code. Generated when a member is added inside an account so each
// member has a stable, collision-safe identifier that can drive a per-member
// public URL and QR. 14 chars from a 32-symbol alphabet → ~1.2 × 10^21 keys.
export const memberCode = () => `MBR-${customAlphabet(alphabet, 14)()}`;

export const linkingCode = () => customAlphabet(alphabet, 8)();

export const otpCode = () => customAlphabet('0123456789', 6)();

export const generateUsername = (first: string, last: string) => {
  const base = `${first.toLowerCase().replace(/[^a-z0-9]/g, '')}.${last.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return `${base}.${customAlphabet('0123456789', 4)()}`;
};
