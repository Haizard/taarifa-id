import AppShell from "@/components/layout/AppShell";
import MoveAccountForm from "@/components/forms/MoveAccountForm";

export default function MoveAccountPage() {
  return (
    <AppShell title="Move Account" showBack>
      <MoveAccountForm />
    </AppShell>
  );
}
