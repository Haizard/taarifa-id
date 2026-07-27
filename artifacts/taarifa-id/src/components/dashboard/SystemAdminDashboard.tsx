import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, CheckCircle, XCircle, Search, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { authHeaders } from "@/contexts/AuthContext";

interface UserRecord {
  _id: string; firstName: string; lastName: string; username: string; mobile: string; email: string;
  accountType: string; profileId: string; isAccountActive: boolean; isActive: boolean;
  paidAmount?: number; paidDate?: string; expireDate?: string; createdAt: string;
}

export default function SystemAdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activating, setActivating] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const res = await fetch("/api/system-admin/users", { headers: authHeaders() });
      const data = await res.json() as { users?: UserRecord[] };
      setUsers(data.users || []);
    } catch { toast.error("Failed to load users"); } finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  async function activateAccount(userId: string) {
    setActivating(userId);
    try {
      const res = await fetch("/api/system-admin/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ userId, paidAmount: 0 }),
      });
      if (res.ok) { toast.success("Account activated!"); loadUsers(); }
      else { toast.error("Activation failed"); }
    } finally { setActivating(null); }
  }

  const filtered = users.filter((u) =>
    [u.firstName, u.lastName, u.username, u.profileId, u.email, u.mobile].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isAccountActive).length,
    inactive: users.filter((u) => !u.isAccountActive).length,
    pending: users.filter((u) => !u.isAccountActive && u.isActive).length,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "bg-blue-50 text-blue-700" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "bg-green-50 text-green-700" },
          { label: "Pending", value: stats.pending, icon: CreditCard, color: "bg-amber-50 text-amber-700" },
          { label: "Inactive", value: stats.inactive, icon: XCircle, color: "bg-red-50 text-red-700" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3"><div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} /></div><div><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p><p className="text-xs text-gray-500">{label}</p></div></div></CardContent></Card>
        ))}
      </div>

      <Input placeholder="Search by name, username, profile ID..." leftIcon={<Search size={16} />} value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No users found</div>
        ) : (
          filtered.map((user) => (
            <Card key={user._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                      <Badge variant={user.isAccountActive ? "success" : "warning"}>{user.isAccountActive ? "Active" : "Pending"}</Badge>
                      <Badge variant="secondary">{user.accountType}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{user.profileId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{user.mobile} · {user.email}</p>
                    {user.expireDate && <p className="text-xs text-gray-400 mt-0.5">Expires: {new Date(user.expireDate).toLocaleDateString()}</p>}
                  </div>
                  {!user.isAccountActive && (
                    <Button size="sm" variant="success" loading={activating === user._id} onClick={() => activateAccount(user._id)}>Activate</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
