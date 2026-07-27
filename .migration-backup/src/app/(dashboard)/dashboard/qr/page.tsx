import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import QRCodeDisplay from "@/components/profile/QRCodeDisplay";
import { profileUrl } from "@/lib/utils";

export default async function QRPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const url = profileUrl(user.profileId);
  const isActive = user.isAccountActive;

  return (
    <AppShell title="My QR Code" showBack>
      <QRCodeDisplay
        profileId={user.profileId}
        profileUrl={url}
        name={user.name || ""}
        accountType={user.accountType}
        isActive={isActive}
      />
    </AppShell>
  );
}
