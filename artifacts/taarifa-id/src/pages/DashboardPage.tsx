import AppShell from "@/components/layout/AppShell";
import DashboardHome from "@/components/dashboard/DashboardHome";
import { useSession } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { session } = useSession();
  return (
    <AppShell title="Dashboard">
      <DashboardHome session={session} />
    </AppShell>
  );
}
