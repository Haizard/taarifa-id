import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/mongoose";
import Profile from "@/models/Profile";

// GET /api/profile — get current user's profile
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const profileId = (session.user as any).profileId;
  const profile = await Profile.findOne({ profileId });

  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

// PUT /api/profile — update current user's profile
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const profileId = (session.user as any).profileId;
  const body = await req.json();

  // Strip readonly fields
  const { _id, userId, profileId: pid, accountType, createdAt, ...updateData } = body;

  const profile = await Profile.findOneAndUpdate(
    { profileId },
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
