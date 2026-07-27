export const ACCOUNT_TYPES = [
  "Individual",
  "Family",
  "School",
  "Business",
  "Institution",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const USER_ROLES = {
  INDIVIDUAL: "individual",
  ADMIN: "admin",
  USER: "user",
  SYSTEM_ADMIN: "system_admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Generate a TAARIFA_ID profile ID: TID-XXXXXXXX (uppercase, 8 chars) */
export function generateProfileId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "TID-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Format a Tanzanian phone number to 255XXXXXXXXX */
export function formatTZPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "255" + cleaned.slice(1);
  if (cleaned.startsWith("255")) return cleaned;
  return "255" + cleaned;
}

/** Get expiry date — 31 Dec of current year */
export function getAnnualExpiry(): Date {
  const year = new Date().getFullYear();
  return new Date(`${year}-12-31T23:59:59.000Z`);
}

/** Check if a profile is expired */
export function isExpired(expireDate: Date | string): boolean {
  return new Date(expireDate) < new Date();
}
