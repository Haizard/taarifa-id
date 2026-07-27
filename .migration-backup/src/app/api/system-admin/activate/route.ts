import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import { getAnnualExpiry } from "@/lib/utils";
import { sendSMS } from "@/lib/sms/beem";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "system_admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const { userId, profileId, amount, durationMonths } = await req.json();

  await connectDB();

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Calculate expiry
  const expireDate = getAnnualExpiry();

  await User.findByIdAndUpdate(userId, {
    isAccountActive: true,
    paidAmount: amount,
    paidDate: new Date(),
    expireDate,
  });

  // Notify user via SMS
  await sendSMS(
    user.mobile,
    `TAARIFA_ID: Your account (${profileId}) has been activated. It expires on ${expireDate.toLocaleDateString("en-GB")}. Thank you!`
  );

  return NextResponse.json({ message: "Account activated", expireDate });
}
