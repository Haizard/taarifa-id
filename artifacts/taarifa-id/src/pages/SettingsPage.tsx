import AppShell from "@/components/layout/AppShell";
import SettingsView from "@/components/dashboard/SettingsView";
import { useSession } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { session } = useSession();
  return (
    <AppShell title="Settings" showBack>
      <SettingsView session={session} />
    </AppShell>
  );
}
