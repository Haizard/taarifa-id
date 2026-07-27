import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SystemAdminDashboard from "@/components/dashboard/SystemAdminDashboard";

export default async function SystemAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "system_admin") redirect("/dashboard");

  return (
    <AppShell title="System Admin">
      <SystemAdminDashboard />
    </AppShell>
  );
}
