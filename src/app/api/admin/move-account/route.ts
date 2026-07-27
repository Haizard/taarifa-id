import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";
import Profile from "@/models/Profile";
import { ACCOUNT_TYPES } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const currentUserId = (session.user as any).id;

  try {
    const { targetProfileId, targetPassword, targetAccountType } = await req.json();

    if (!targetProfileId || !targetPassword || !targetAccountType) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (!ACCOUNT_TYPES.includes(targetAccountType)) {
      return NextResponse.json({ message: "Invalid account type" }, { status: 400 });
    }

    await connectDB();

    // Verify target profile exists and credentials match
    const targetUser = await User.findOne({ profileId: targetProfileId }).select("+password");
    if (!targetUser) {
      return NextResponse.json({ message: "Profile ID not found" }, { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(targetPassword, targetUser.password);
    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid credentials for that profile" }, { status: 400 });
    }

    // Prevent moving to same account type
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return NextResponse.json({ message: "Current user not found" }, { status: 404 });
    }

    if (targetUser._id.toString() === currentUserId) {
      return NextResponse.json({ message: "You cannot move your own account" }, { status: 400 });
    }

    // Find the admin of the target account type (if moving to admin-managed type)
    if (targetAccountType !== "Individual") {
      // target user must be an admin of that type
      if (targetUser.role !== "admin" || targetUser.accountType !== targetAccountType) {
        return NextResponse.json({
          message: `The provided profile is not an admin of a ${targetAccountType} account`,
        }, { status: 400 });
      }

      // Move current user under that admin
      await User.findByIdAndUpdate(currentUserId, {
        parentAdminId: targetUser._id,
        accountType: targetAccountType,
        role: "user",
      });

      await Profile.findOneAndUpdate(
        { profileId: currentUser.profileId },
        { accountType: targetAccountType }
      );

      return NextResponse.json({
        message: `Account moved to ${targetAccountType} under ${targetUser.firstName} ${targetUser.lastName}.`,
      });
    }

    // Moving to Individual — remove from admin, become standalone
    await User.findByIdAndUpdate(currentUserId, {
      parentAdminId: null,
      accountType: "Individual",
      role: "individual",
    });

    await Profile.findOneAndUpdate(
      { profileId: currentUser.profileId },
      { accountType: "Individual" }
    );

    return NextResponse.json({ message: "Account moved to Individual successfully." });
  } catch (error) {
    console.error("Move account error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
