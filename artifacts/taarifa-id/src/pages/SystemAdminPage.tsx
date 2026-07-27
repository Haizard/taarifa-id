import AppShell from "@/components/layout/AppShell";
import SystemAdminDashboard from "@/components/dashboard/SystemAdminDashboard";

export default function SystemAdminPage() {
  return (
    <AppShell title="System Admin">
      <SystemAdminDashboard />
    </AppShell>
  );
}
