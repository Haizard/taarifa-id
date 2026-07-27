import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "All fields required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: "New password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById((session.user as any).id).select("+password");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user._id, { password: hashed });

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
