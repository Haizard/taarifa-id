import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SubAccountsManager from "@/components/dashboard/SubAccountsManager";

export default async function SubAccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "admin") redirect("/dashboard");

  return (
    <AppShell title="Sub-Accounts" showBack>
      <SubAccountsManager session={session} />
    </AppShell>
  );
}
