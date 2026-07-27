import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SMSSender from "@/components/dashboard/SMSSender";

export default async function SMSPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "admin") redirect("/dashboard");

  return (
    <AppShell title="Send SMS" showBack>
      <SMSSender session={session} />
    </AppShell>
  );
}
