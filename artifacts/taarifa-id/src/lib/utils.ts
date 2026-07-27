import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  "Mother", "Father", "Son", "Daughter", "Husband", "Wife",
  "Guardian", "Grandfather", "Grandmother", "Next of Kin",
  "Employer", "Friend",
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
  "Heart Attack", "Stroke", "Pneumonia", "Kidney Infections", "Skin Infections",
  "Sepsis", "Problems associated with Diabetes", "Obstructive Lung Disease",
  "Obstructive Heart Disease", "Head Injury with passing out / fainting / confusion",
  "Injury to Neck", "Injury to Spine", "Electric Shock", "Severe Burn",
  "Severe Chest Pain or Pressure", "Passing Out / Fainting", "Pain in the Arm or Jaw",
  "Unusual or Bad Headache", "Suddenly not able to speak, see, walk or move",
  "Suddenly weak or drooping on one side of the body",
  "Dizziness or Weakness that does not go away", "Inhaled Smoke or Poisonous Fumes",
  "Sudden Confusion", "Heavy Bleeding", "Possible Broken Bone / Loss of Movement",
  "Deep Wound", "Coughing or Throwing Up Blood", "Severe Pain anywhere on the Body",
  "Severe Allergic Reaction with Trouble Breathing / Swelling / Hives",
  "High Fever with Headache and Stiff Neck",
  "High Fever that does not get better with medicine",
  "Throwing Up or Loose Stools that does not stop",
  "Poisoning or Overdose of Drug or Alcohol", "Suicidal Thoughts", "Seizures",
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

export function calculateAge(birthdate: Date | string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function profileUrl(profileId: string): string {
  const base = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${base}/profile/${profileId}`;
}

export function isExpired(expireDate: Date | string): boolean {
  return new Date(expireDate) < new Date();
}
