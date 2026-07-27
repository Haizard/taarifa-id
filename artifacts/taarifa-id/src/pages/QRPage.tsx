import AppShell from "@/components/layout/AppShell";
import QRCodeDisplay from "@/components/profile/QRCodeDisplay";
import { useSession } from "@/contexts/AuthContext";
import { profileUrl } from "@/lib/utils";

export default function QRPage() {
  const { session } = useSession();
  const user = session?.user;
  if (!user) return null;

  const url = profileUrl(user.profileId);

  return (
    <AppShell title="My QR Code" showBack>
      <QRCodeDisplay
        profileId={user.profileId}
        profileUrl={url}
        name={user.name || ""}
        accountType={user.accountType}
        isActive={user.isAccountActive}
      />
    </AppShell>
  );
}
