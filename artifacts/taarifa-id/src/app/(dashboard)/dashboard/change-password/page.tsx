import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell title="Change Password" showBack>
      <ChangePasswordForm />
    </AppShell>
  );
}
