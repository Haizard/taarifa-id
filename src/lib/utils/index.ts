import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a TAARIFA_ID profile ID: TID-XXXXXX (uppercase, 8 chars) */
export function generateProfileId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "TID-";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/** Calculate age from birthdate */
export function calculateAge(birthdate: Date | string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
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

/** Format a Tanzanian phone number */
export function formatTZPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "255" + cleaned.slice(1);
  if (cleaned.startsWith("255")) return cleaned;
  return "255" + cleaned;
}

/** Public profile URL */
export function profileUrl(profileId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/profile/${profileId}`;
}

export const ACCOUNT_TYPES = [
  "Individual",
  "Family",
  "School",
  "Business",
  "Institution",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const RELATION_TYPES = [
  "Mother",
  "Father",
  "Son",
  "Daughter",
  "Husband",
  "Wife",
  "Guardian",
  "Grandfather",
  "Grandmother",
  "Next of Kin",
  "Employer",
  "Friend",
] as const;

export const EMPLOYMENT_TYPES = [
  "Employed By the Government",
  "Employed By the Foreign Government",
  "Employed By the Foreign Agency",
  "Employed By the Company",
  "Employed By the Corporate",
  "Self Employed",
  "Not Working",
] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const ACUTE_CONDITIONS = [
  "Heart Attack",
  "Stroke",
  "Pneumonia",
  "Kidney Infections",
  "Skin Infections",
  "Sepsis",
  "Problems associated with Diabetes",
  "Obstructive Lung Disease",
  "Obstructive Heart Disease",
  "Head Injury with passing out / fainting / confusion",
  "Injury to Neck",
  "Injury to Spine",
  "Electric Shock",
  "Severe Burn",
  "Severe Chest Pain or Pressure",
  "Passing Out / Fainting",
  "Pain in the Arm or Jaw",
  "Unusual or Bad Headache",
  "Suddenly not able to speak, see, walk or move",
  "Suddenly weak or drooping on one side of the body",
  "Dizziness or Weakness that does not go away",
  "Inhaled Smoke or Poisonous Fumes",
  "Sudden Confusion",
  "Heavy Bleeding",
  "Possible Broken Bone / Loss of Movement",
  "Deep Wound",
  "Coughing or Throwing Up Blood",
  "Severe Pain anywhere on the Body",
  "Severe Allergic Reaction with Trouble Breathing / Swelling / Hives",
  "High Fever with Headache and Stiff Neck",
  "High Fever that does not get better with medicine",
  "Throwing Up or Loose Stools that does not stop",
  "Poisoning or Overdose of Drug or Alcohol",
  "Suicidal Thoughts",
  "Seizures",
] as const;

export const TZ_REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera",
  "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
  "Mbeya", "Mjini Magharibi", "Morogoro", "Mtwara", "Mwanza",
  "Njombe", "Pemba Kaskazini", "Pemba Kusini", "Pwani", "Rukwa",
  "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora",
  "Tanga", "Unguja Kaskazini", "Unguja Kusini",
] as const;

export const USER_ROLES = {
  INDIVIDUAL: "individual",
  ADMIN: "admin",
  USER: "user",
  SYSTEM_ADMIN: "system_admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
