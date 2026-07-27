import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "system_admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;

  const query = search
    ? {
        $or: [
          { firstName: new RegExp(search, "i") },
          { lastName: new RegExp(search, "i") },
          { username: new RegExp(search, "i") },
          { profileId: new RegExp(search, "i") },
          { mobile: new RegExp(search, "i") },
          { email: new RegExp(search, "i") },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -otpCode -otpExpiry -resetToken -resetTokenExpiry")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return NextResponse.json({ users, total, page, limit });
}
