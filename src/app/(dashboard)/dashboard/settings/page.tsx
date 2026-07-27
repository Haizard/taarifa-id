import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SettingsView from "@/components/dashboard/SettingsView";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell title="Settings" showBack>
      <SettingsView session={session} />
    </AppShell>
  );
}
