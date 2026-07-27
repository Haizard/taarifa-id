import mongoose, { Schema, Document, Model } from "mongoose";
import type { AccountType, UserRole } from "../lib/utils.js";

export interface IUser extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthdate: Date;
  gender: "Male" | "Female";
  mobile: string;
  email: string;
  username: string;
  password: string;
  accountType: AccountType;
  role: UserRole;
  nationality: "Tanzanian" | "Foreigner";
  nidaNumber?: string;
  passportNumber?: string;
  profileId: string;
  parentAdminId?: mongoose.Types.ObjectId;
  isActive: boolean;
  isFirstLogin: boolean;
  otpCode?: string;
  otpExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  paidAmount?: number;
  paidDate?: Date;
  expireDate?: Date;
  isAccountActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthdate: { type: Date, required: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    accountType: {
      type: String,
      enum: ["Individual", "Family", "School", "Business", "Institution"],
      required: true,
    },
    role: {
      type: String,
      enum: ["individual", "admin", "user", "system_admin"],
      default: "individual",
    },
    nationality: { type: String, enum: ["Tanzanian", "Foreigner"], required: true },
    nidaNumber: { type: String, trim: true },
    passportNumber: { type: String, trim: true },
    profileId: { type: String, required: true, unique: true },
    parentAdminId: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    isFirstLogin: { type: Boolean, default: true },
    otpCode: { type: String },
    otpExpiry: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    paidAmount: { type: Number },
    paidDate: { type: Date },
    expireDate: { type: Date },
    isAccountActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ firstName: "text", lastName: "text", username: "text", profileId: "text" });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
