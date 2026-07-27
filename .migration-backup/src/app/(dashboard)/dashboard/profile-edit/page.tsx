import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ProfileEditForm from "@/components/forms/ProfileEditForm";

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: { section?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const section = searchParams.section || "basic";

  return (
    <AppShell title="Edit Profile" showBack>
      <ProfileEditForm session={session} section={section} />
    </AppShell>
  );
}
