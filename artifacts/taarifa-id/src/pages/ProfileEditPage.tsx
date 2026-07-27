import AppShell from "@/components/layout/AppShell";
import ProfileEditForm from "@/components/forms/ProfileEditForm";

export default function ProfileEditPage() {
  return (
    <AppShell title="Edit Profile" showBack>
      <ProfileEditForm />
    </AppShell>
  );
}
