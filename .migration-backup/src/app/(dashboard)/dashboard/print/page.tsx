import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PrintableIDCard from "@/components/profile/PrintableIDCard";
import { profileUrl } from "@/lib/utils";

export default async function PrintPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  return (
    <AppShell title="Print ID Card" showBack>
      <PrintableIDCard
        profileId={user.profileId}
        profileUrl={profileUrl(user.profileId)}
        name={user.name || ""}
        accountType={user.accountType}
      />
    </AppShell>
  );
}
