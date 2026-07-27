import mongoose, { Schema, Document, Model } from "mongoose";
import { AccountType } from "@/lib/utils";

// ─── Shared sub-schemas ────────────────────────────────────────────────────

const ResidenceSchema = new Schema({
  region: String,
  district: String,
  ward: String,
  localAuthorityName: String,
  street: String,
  neighborhoodDetails: String,
  neighborhoodFriendName: String,     // PU_P
  neighborhoodFriendContacts: String, // PU_P
}, { _id: false });

const EmergencyContactSchema = new Schema({
  fullName: String,               // P
  mobile1: String,                // P
  mobile2: String,                // P
  altMobile1: String,
  altMobile2: String,
  relationType: String,
  residenceDetails: String,
  fluentLanguage: String,
  region: String,
  district: String,
  ward: String,
  localAuthorityName: String,
  extraNotes: String,
}, { _id: false });

const HealthSchema = new Schema({
  bloodGroup: String,             // P
  height: String,
  weight: String,
}, { _id: false });

const DesperateConditionSchema = new Schema({
  acuteCondition: String,         // PU_P
  notes: String,                  // PU_P
  occurrence: String,             // PU_P
  unconsciousTreatmentRemedy: String, // P
  hospital: String,
  hospitalRegion: String,
  hospitalDistrict: String,
  hospitalContacts: String,
  doctorName: String,             // PU_P
  doctorContacts: String,         // PU_P
}, { _id: false });

const EmploymentSchema = new Schema({
  employmentType: String,         // PU
  employerName: String,           // PU_P
  employerLogoUrl: String,        // PU_P
  employmentPosition: String,     // PU_P
  officeRegion: String,
  officeDistrict: String,
  officeWard: String,
  officeLocalAuthority: String,
  officeExtraNotes: String,
  officeContacts: String,
  supervisorName: String,         // PU_P
  supervisorContacts1: String,    // PU_P
  supervisorContacts2: String,    // PU_P
  closeOfficeFriendName: String,  // PU_P
  closeOfficeFriendContacts: String, // PU_P
  supervisorExtraNotes: String,
}, { _id: false });

// ─── Underage sub-schema (for Family) ──────────────────────────────────────

const UnderageSchema = new Schema({
  profileId: String,
  commonName: String,             // PU_P
  profileCode: String,
  picUrl: String,
  firstName: String,              // PU_P
  middleName: String,             // PU_P
  lastName: String,               // PU_P
  gender: String,
  birthdate: Date,                // PU
  nationality: String,            // PU_P
  passportNumber: String,         // PU_P
  fluentLanguage: String,
  emergencyContacts: [EmergencyContactSchema],
  health: HealthSchema,
  desperateConditions: [DesperateConditionSchema],
  schoolName: String,             // PU_P
  schoolLogoUrl: String,          // PU_P
  schoolStream: String,           // PU_P
  schoolRegion: String,
  schoolDistrict: String,
  schoolWard: String,
  schoolLocalAuthority: String,
  schoolExtraNotes: String,
  schoolContacts: String,
});

// ─── Main Profile schema ───────────────────────────────────────────────────

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: string;
  accountType: AccountType;
  picUrl?: string;

  // Individual / sub-user personal info
  commonName?: string;            // PU_P
  firstName?: string;             // PU_P
  middleName?: string;            // PU_P
  lastName?: string;              // PU_P
  gender?: string;
  birthdate?: Date;               // PU
  mobile1?: string;               // PU_P
  mobile2?: string;               // PU_P
  nationality?: string;           // PU_P
  nidaNumber?: string;
  passportNumber?: string;        // PU_P

  // Sections
  health?: typeof HealthSchema;
  residence?: typeof ResidenceSchema;
  desperateConditions?: (typeof DesperateConditionSchema)[];
  emergencyContacts?: (typeof EmergencyContactSchema)[];
  employment?: typeof EmploymentSchema;

  // Family specific
  familyName?: string;
  familyPicUrl?: string;
  familyDoctorHospital?: string;
  familyDoctorRegion?: string;
  familyDoctorDistrict?: string;
  familyDoctorContacts?: string;
  familyDoctorName?: string;      // PU_P
  familyDoctorContactDirect?: string; // PU_P
  linkingCode?: string;
  underageMembers?: (typeof UnderageSchema)[];

  // Org specific (School / Business / Institution)
  orgName?: string;               // PU_P
  orgLogoUrl?: string;            // PU_P
  orgRegistrationNumber?: string;
  orgOwnership?: string;          // PU (School)
  orgDealership?: string;         // PU (Business/Institution)
  orgTinNumber?: string;
  orgRegion?: string;
  orgDistrict?: string;
  orgWard?: string;
  orgLocalAuthority?: string;
  orgExtraNotes?: string;
  orgContacts?: string;
  orgManagerContacts?: string;

  // Profile visibility overrides (fields user marked as public/hidden)
  publicFields?: string[];

  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profileId: { type: String, required: true, unique: true },
    accountType: {
      type: String,
      enum: ["Individual", "Family", "School", "Business", "Institution"],
      required: true,
    },
    picUrl: String,

    // Personal
    commonName: String,
    firstName: String,
    middleName: String,
    lastName: String,
    gender: String,
    birthdate: Date,
    mobile1: String,
    mobile2: String,
    nationality: String,
    nidaNumber: String,
    passportNumber: String,

    // Sections
    health: { type: HealthSchema },
    residence: { type: ResidenceSchema },
    desperateConditions: { type: [DesperateConditionSchema], default: [] },
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },
    employment: { type: EmploymentSchema },

    // Family
    familyName: String,
    familyPicUrl: String,
    familyDoctorHospital: String,
    familyDoctorRegion: String,
    familyDoctorDistrict: String,
    familyDoctorContacts: String,
    familyDoctorName: String,
    familyDoctorContactDirect: String,
    linkingCode: String,
    underageMembers: { type: [UnderageSchema], default: [] },

    // Org
    orgName: String,
    orgLogoUrl: String,
    orgRegistrationNumber: String,
    orgOwnership: String,
    orgDealership: String,
    orgTinNumber: String,
    orgRegion: String,
    orgDistrict: String,
    orgWard: String,
    orgLocalAuthority: String,
    orgExtraNotes: String,
    orgContacts: String,
    orgManagerContacts: String,

    publicFields: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>("Profile", ProfileSchema);

export default Profile;
