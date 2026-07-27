import AppShell from "@/components/layout/AppShell";
import SMSSender from "@/components/dashboard/SMSSender";

export default function SMSPage() {
  return (
    <AppShell title="Send SMS" showBack>
      <SMSSender />
    </AppShell>
  );
}
