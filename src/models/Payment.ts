import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  profileId: string;
  amount: number;
  currency: string;
  paymentMethod: "mobile_wallet" | "bank_transfer" | "cash";
  reference: string;
  activatedBy?: mongoose.Types.ObjectId; // System Admin user ID
  activatedAt?: Date;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  status: "pending" | "active" | "expired";
  notes?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    profileId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "TZS" },
    paymentMethod: {
      type: String,
      enum: ["mobile_wallet", "bank_transfer", "cash"],
      required: true,
    },
    reference: { type: String, required: true },
    activatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    activatedAt: { type: Date },
    durationMonths: { type: Number, default: 12 },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "active", "expired"],
      default: "pending",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
