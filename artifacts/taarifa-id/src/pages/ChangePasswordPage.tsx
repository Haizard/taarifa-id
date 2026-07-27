import AppShell from "@/components/layout/AppShell";
import ChangePasswordForm from "@/components/forms/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <AppShell title="Change Password" showBack>
      <ChangePasswordForm />
    </AppShell>
  );
}
