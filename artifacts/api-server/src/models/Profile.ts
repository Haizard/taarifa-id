import mongoose, { Schema, Document, Model } from "mongoose";
import type { AccountType } from "../lib/utils.js";

const ResidenceSchema = new Schema({ region: String, district: String, ward: String, localAuthorityName: String, street: String, neighborhoodDetails: String, neighborhoodFriendName: String, neighborhoodFriendContacts: String }, { _id: false });
const EmergencyContactSchema = new Schema({ fullName: String, mobile1: String, mobile2: String, altMobile1: String, altMobile2: String, relationType: String, residenceDetails: String, fluentLanguage: String, region: String, district: String, ward: String, localAuthorityName: String, extraNotes: String }, { _id: false });
const HealthSchema = new Schema({ bloodGroup: String, height: String, weight: String }, { _id: false });
const DesperateConditionSchema = new Schema({ acuteCondition: String, notes: String, occurrence: String, unconsciousTreatmentRemedy: String, hospital: String, hospitalRegion: String, hospitalDistrict: String, hospitalContacts: String, doctorName: String, doctorContacts: String }, { _id: false });
const EmploymentSchema = new Schema({ employmentType: String, employerName: String, employerLogoUrl: String, employmentPosition: String, officeRegion: String, officeDistrict: String, officeWard: String, officeLocalAuthority: String, officeExtraNotes: String, officeContacts: String, supervisorName: String, supervisorContacts1: String, supervisorContacts2: String, closeOfficeFriendName: String, closeOfficeFriendContacts: String, supervisorExtraNotes: String }, { _id: false });
const UnderageSchema = new Schema({ profileId: String, commonName: String, profileCode: String, picUrl: String, firstName: String, middleName: String, lastName: String, gender: String, birthdate: Date, nationality: String, passportNumber: String, fluentLanguage: String, emergencyContacts: [EmergencyContactSchema], health: HealthSchema, desperateConditions: [DesperateConditionSchema], schoolName: String, schoolLogoUrl: String, schoolStream: String, schoolRegion: String, schoolDistrict: String, schoolWard: String, schoolLocalAuthority: String, schoolExtraNotes: String, schoolContacts: String });

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: string;
  accountType: AccountType;
  picUrl?: string;
  commonName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  birthdate?: Date;
  mobile1?: string;
  mobile2?: string;
  nationality?: string;
  nidaNumber?: string;
  passportNumber?: string;
  health?: Record<string, unknown>;
  residence?: Record<string, unknown>;
  desperateConditions?: Record<string, unknown>[];
  emergencyContacts?: Record<string, unknown>[];
  employment?: Record<string, unknown>;
  familyName?: string;
  familyPicUrl?: string;
  familyDoctorHospital?: string;
  familyDoctorRegion?: string;
  familyDoctorDistrict?: string;
  familyDoctorContacts?: string;
  familyDoctorName?: string;
  familyDoctorContactDirect?: string;
  linkingCode?: string;
  underageMembers?: Record<string, unknown>[];
  orgName?: string;
  orgLogoUrl?: string;
  orgRegistrationNumber?: string;
  orgOwnership?: string;
  orgDealership?: string;
  orgTinNumber?: string;
  orgRegion?: string;
  orgDistrict?: string;
  orgWard?: string;
  orgLocalAuthority?: string;
  orgExtraNotes?: string;
  orgContacts?: string;
  orgManagerContacts?: string;
  publicFields?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profileId: { type: String, required: true, unique: true },
    accountType: { type: String, enum: ["Individual", "Family", "School", "Business", "Institution"], required: true },
    picUrl: String,
    commonName: String, firstName: String, middleName: String, lastName: String, gender: String,
    birthdate: Date, mobile1: String, mobile2: String, nationality: String, nidaNumber: String, passportNumber: String,
    health: { type: HealthSchema },
    residence: { type: ResidenceSchema },
    desperateConditions: { type: [DesperateConditionSchema], default: [] },
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },
    employment: { type: EmploymentSchema },
    familyName: String, familyPicUrl: String, familyDoctorHospital: String, familyDoctorRegion: String,
    familyDoctorDistrict: String, familyDoctorContacts: String, familyDoctorName: String, familyDoctorContactDirect: String,
    linkingCode: String, underageMembers: { type: [UnderageSchema], default: [] },
    orgName: String, orgLogoUrl: String, orgRegistrationNumber: String, orgOwnership: String, orgDealership: String,
    orgTinNumber: String, orgRegion: String, orgDistrict: String, orgWard: String, orgLocalAuthority: String,
    orgExtraNotes: String, orgContacts: String, orgManagerContacts: String,
    publicFields: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>("Profile", ProfileSchema);

export default Profile;
