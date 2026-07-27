import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import Profile from "@/models/Profile";
import { generateProfileId, getAnnualExpiry, USER_ROLES } from "@/lib/utils";
import { generateOTP, sendOTPSMS, sendWelcomeSMS } from "@/lib/sms/beem";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      middleName,
      lastName,
      birthdate,
      gender,
      mobile,
      email,
      username,
      password,
      accountType,
      nationality,
      nidaNumber,
      passportNumber,
    } = body;

    await connectDB();

    // Check for existing user
    const existing = await User.findOne({
      $or: [
        { mobile },
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    });

    if (existing) {
      let field = "mobile number";
      if (existing.email === email.toLowerCase()) field = "email address";
      if (existing.username === username.toLowerCase()) field = "username";
      return NextResponse.json(
        { message: `This ${field} is already registered` },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique profile ID
    let profileId = generateProfileId();
    while (await User.findOne({ profileId })) {
      profileId = generateProfileId();
    }

    // Generate OTP
    const { code: otpCode, expiry: otpExpiry } = generateOTP();

    // Determine role
    const role =
      accountType === "Individual"
        ? USER_ROLES.INDIVIDUAL
        : USER_ROLES.ADMIN;

    // Create user
    const user = await User.create({
      firstName: firstName.trim(),
      middleName: middleName?.trim(),
      lastName: lastName.trim(),
      birthdate: new Date(birthdate),
      gender,
      mobile,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      accountType,
      role,
      nationality,
      nidaNumber,
      passportNumber,
      profileId,
      isFirstLogin: true,
      otpCode,
      otpExpiry,
      expireDate: getAnnualExpiry(),
    });

    // Create empty profile
    await Profile.create({
      userId: user._id,
      profileId,
      accountType,
      firstName: firstName.trim(),
      middleName: middleName?.trim(),
      lastName: lastName.trim(),
      gender,
      birthdate: new Date(birthdate),
      nationality,
    });

    // Send OTP SMS
    await sendOTPSMS(mobile, otpCode);
    await sendWelcomeSMS(mobile, firstName, profileId);

    return NextResponse.json(
      { message: "Account created successfully", profileId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
