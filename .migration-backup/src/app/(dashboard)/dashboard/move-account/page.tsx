import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import MoveAccountForm from "@/components/forms/MoveAccountForm";

export default async function MoveAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell title="Move Account" showBack>
      <MoveAccountForm />
    </AppShell>
  );
}
