import { Link } from "wouter";
import { useSession } from "@/contexts/AuthContext";
import type { Session } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, LogOut, UserCheck, RefreshCw, Shield, ChevronRight, Info, Calendar } from "lucide-react";

interface Props { session: Session | null }

export default function SettingsView({ session }: Props) {
  const { logout } = useSession();
  if (!session) return null;
  const user = session.user;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck size={16} /> Account Information</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Row label="Full Name" value={user.name} />
          <Row label="Profile ID" value={user.profileId} mono />
          <Row label="Account Type" value={<Badge>{user.accountType}</Badge>} />
          <Row label="Role" value={<Badge variant="secondary">{user.role}</Badge>} />
          <Row label="Status" value={<Badge variant={user.isAccountActive ? "success" : "warning"}>{user.isAccountActive ? "Active" : "Pending Activation"}</Badge>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield size={16} /> Account Actions</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Link href="/dashboard/change-password">
            <Button variant="outline" fullWidth className="justify-between">
              <span className="flex items-center gap-2"><Lock size={16} /> Change Password</span>
              <ChevronRight size={16} />
            </Button>
          </Link>
          <Link href="/dashboard/move-account">
            <Button variant="outline" fullWidth className="justify-between">
              <span className="flex items-center gap-2"><RefreshCw size={16} /> Move Account</span>
              <ChevronRight size={16} />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar size={16} /> Subscription</CardTitle></CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Annual renewal required by 31 December</p>
            <p className="text-xs mt-1 opacity-75">Contact Sunriver Systems to renew your subscription.</p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info size={14} className="mt-0.5 shrink-0" />
            <p>When your account expires, your QR code will redirect to the payment page automatically.</p>
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" fullWidth onClick={logout} className="mt-2">
        <LogOut size={16} /> Sign Out
      </Button>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
