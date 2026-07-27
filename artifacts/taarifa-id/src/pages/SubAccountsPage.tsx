import AppShell from "@/components/layout/AppShell";
import SubAccountsManager from "@/components/dashboard/SubAccountsManager";

export default function SubAccountsPage() {
  return (
    <AppShell title="Sub-Accounts" showBack>
      <SubAccountsManager />
    </AppShell>
  );
}
