import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import Profile from "@/models/Profile";
import { generateProfileId, getAnnualExpiry, USER_ROLES } from "@/lib/utils";
import { sendOTPSMS } from "@/lib/sms/beem";
import { generateOTP } from "@/lib/sms/beem";

// GET — list sub-accounts for this admin
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const adminId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "admin") {
    return NextResponse.json({ message: "Only admin accounts can manage sub-accounts" }, { status: 403 });
  }

  await connectDB();

  const subAccounts = await User.find({ parentAdminId: adminId })
    .select("-password -otpCode -resetToken")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ subAccounts });
}

// POST — create a new sub-account
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const adminId = (session.user as any).id;
  const adminAccountType = (session.user as any).accountType;
  const role = (session.user as any).role;

  if (role !== "admin") {
    return NextResponse.json({ message: "Only admin accounts can create sub-accounts" }, { status: 403 });
  }

  try {
    const {
      firstName, middleName, lastName, birthdate, gender,
      mobile, email, username, password,
      nationality, nidaNumber, passportNumber,
    } = await req.json();

    await connectDB();

    // Check uniqueness
    const existing = await User.findOne({
      $or: [{ mobile }, { email: email?.toLowerCase() }, { username: username?.toLowerCase() }],
    });

    if (existing) {
      const field =
        existing.mobile === mobile ? "mobile"
        : existing.email === email?.toLowerCase() ? "email"
        : "username";
      return NextResponse.json({ message: `This ${field} is already registered` }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let profileId = generateProfileId();
    while (await User.findOne({ profileId })) profileId = generateProfileId();

    const { code: otpCode, expiry: otpExpiry } = generateOTP();

    const subUser = await User.create({
      firstName: firstName.trim(),
      middleName: middleName?.trim(),
      lastName: lastName.trim(),
      birthdate: new Date(birthdate),
      gender,
      mobile,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      accountType: adminAccountType,
      role: USER_ROLES.USER,
      nationality,
      nidaNumber,
      passportNumber,
      profileId,
      parentAdminId: adminId,
      isFirstLogin: true,
      otpCode,
      otpExpiry,
      expireDate: getAnnualExpiry(),
      isAccountActive: false,
    });

    await Profile.create({
      userId: subUser._id,
      profileId,
      accountType: adminAccountType,
      firstName: firstName.trim(),
      middleName: middleName?.trim(),
      lastName: lastName.trim(),
      gender,
      birthdate: new Date(birthdate),
      nationality,
    });

    await sendOTPSMS(mobile, otpCode);

    return NextResponse.json(
      { message: "Sub-account created", profileId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create sub-account error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// PATCH — lock/unlock a sub-account or reset password
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const adminId = (session.user as any).id;
  const role = (session.user as any).role;

  if (role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { subUserId, action, newPassword } = await req.json();

    await connectDB();

    // Ensure target user belongs to this admin
    const subUser = await User.findOne({ _id: subUserId, parentAdminId: adminId });
    if (!subUser) {
      return NextResponse.json({ message: "Sub-account not found" }, { status: 404 });
    }

    if (action === "lock") {
      await User.findByIdAndUpdate(subUserId, { isActive: false });
      return NextResponse.json({ message: "Account locked" });
    }

    if (action === "unlock") {
      await User.findByIdAndUpdate(subUserId, { isActive: true });
      return NextResponse.json({ message: "Account unlocked" });
    }

    if (action === "reset_password") {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ message: "New password must be at least 8 characters" }, { status: 400 });
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await User.findByIdAndUpdate(subUserId, {
        password: hashed,
        isFirstLogin: true,
      });
      return NextResponse.json({ message: "Password reset. User will need to log in again." });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Sub-account PATCH error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
