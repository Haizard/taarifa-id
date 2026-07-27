import AppShell from "@/components/layout/AppShell";
import PrintableIDCard from "@/components/profile/PrintableIDCard";

export default function PrintPage() {
  return (
    <AppShell title="Print ID Card" showBack>
      <PrintableIDCard />
    </AppShell>
  );
}
