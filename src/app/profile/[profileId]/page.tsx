import { notFound, redirect } from "next/navigation";
import PublicProfileView from "@/components/profile/PublicProfileView";
import { connectDB } from "@/lib/db/mongoose";
import Profile from "@/models/Profile";
import User from "@/models/User";
import { isExpired } from "@/lib/utils";

interface Props {
  params: Promise<{ profileId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { profileId } = await params;
  return {
    title: `Profile ${profileId} — TAARIFA_ID`,
    description: "TAARIFA_ID Emergency Profile",
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { profileId } = await params;

  await connectDB();

  const user = await User.findOne({ profileId });
  if (!user) notFound();

  // Expired — redirect to payment page
  if (user.expireDate && isExpired(user.expireDate)) {
    redirect(`/renew/${profileId}`);
  }

  const profile = await Profile.findOne({ profileId });
  if (!profile) notFound();

  const profileData = profile.toObject();

  return <PublicProfileView profile={profileData} />;
}
