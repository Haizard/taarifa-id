import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import { sendSMS } from "@/lib/sms/beem";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json(); // mobile, email, or username

    if (!identifier) {
      return NextResponse.json({ message: "Please provide your mobile, email or username" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({
      $or: [
        { mobile: identifier },
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    });

    // Always return success to prevent user enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset code has been sent." });
    }

    // Generate 6-digit reset token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await User.findByIdAndUpdate(user._id, {
      resetToken,
      resetTokenExpiry,
    });

    await sendSMS(
      user.mobile,
      `TAARIFA_ID: Your password reset code is ${resetToken}. Valid for 15 minutes. Do not share this code.`
    );

    return NextResponse.json({
      message: "If an account exists, a reset code has been sent to the registered mobile number.",
      // Only expose masked mobile for UX (never full number)
      maskedMobile: user.mobile.slice(0, -4).replace(/./g, "*") + user.mobile.slice(-4),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
