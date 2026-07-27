import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Profile from "@/models/Profile";
import User from "@/models/User";
import { isExpired } from "@/lib/utils";

// GET /api/profile/[profileId] — public profile scan
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  await connectDB();

  const { profileId } = await params;

  // Check if user account is active and not expired
  const user = await User.findOne({ profileId });

  if (!user) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }

  // If expired — return redirect signal
  if (user.expireDate && isExpired(user.expireDate)) {
    return NextResponse.json(
      { expired: true, profileId, message: "This profile has expired" },
      { status: 200 }
    );
  }

  const profile = await Profile.findOne({ profileId });

  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }

  // Return only public fields (PU fields filtered unless owner)
  const profileObj = profile.toObject() as any;
  const publicProfile = {
    profileId: profileObj.profileId,
    accountType: profileObj.accountType,
    picUrl: profileObj.picUrl,
    commonName: profileObj.commonName,
    firstName: profileObj.firstName,
    middleName: profileObj.middleName,
    lastName: profileObj.lastName,
    gender: profileObj.gender,
    // Health - blood group is P (printable/public)
    bloodGroup: profileObj.health?.bloodGroup,
    // Desperate conditions are PU_P — shown based on user preference
    desperateConditions: profileObj.publicFields?.includes("desperateConditions")
      ? profileObj.desperateConditions
      : [],
    // Emergency contacts first entry always visible
    primaryEmergencyContact: profileObj.emergencyContacts?.[0] || null,
    // Org info
    orgName: profileObj.orgName,
    orgLogoUrl: profileObj.orgLogoUrl,
    orgRegion: profileObj.orgRegion,
    orgDistrict: profileObj.orgDistrict,
    orgContacts: profileObj.orgContacts,
  };

  return NextResponse.json(publicProfile);
}
