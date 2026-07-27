import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Lock, Unlock, RefreshCw, Users, X, Eye, EyeOff } from "lucide-react";
import { authHeaders } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/AuthContext";

interface SubAccount { _id: string; firstName: string; lastName: string; username: string; mobile: string; profileId: string; isActive: boolean; isAccountActive: boolean; accountType: string; createdAt: string }

const createSchema = z.object({
  firstName: z.string().min(2, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Required"),
  birthdate: z.string().min(1, "Required"),
  gender: z.enum(["Male", "Female"]),
  mobile: z.string().regex(/^(255|0)\d{9}$/, "Invalid phone"),
  email: z.string().email("Invalid email"),
  username: z.string().min(3).regex(/^[a-z0-9_]+$/, "Lowercase, numbers, underscores only"),
  password: z.string().min(8, "Min 8 characters"),
  nationality: z.enum(["Tanzanian", "Foreigner"]),
  nidaNumber: z.string().optional(),
  passportNumber: z.string().optional(),
});
type CreateFormData = z.infer<typeof createSchema>;

export default function SubAccountsManager() {
  const { session } = useSession();
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<SubAccount | null>(null);
  const [resetPwd, setResetPwd] = useState("");

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CreateFormData>({ resolver: zodResolver(createSchema) });
  const nationality = watch("nationality");

  async function loadSubAccounts() {
    try {
      const res = await fetch("/api/admin/sub-accounts", { headers: authHeaders() });
      const data = await res.json() as SubAccount[] | { subAccounts?: SubAccount[] };
      setSubAccounts(Array.isArray(data) ? data : (data as { subAccounts?: SubAccount[] }).subAccounts || []);
    } catch { toast.error("Failed to load sub-accounts"); } finally { setLoading(false); }
  }

  useEffect(() => { loadSubAccounts(); }, []);

  async function onCreate(data: CreateFormData) {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/sub-accounts", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
      const json = await res.json() as { error?: string; profileId?: string };
      if (!res.ok) { toast.error(json.error || "Failed"); return; }
      toast.success(`Sub-account created! Profile ID: ${json.profileId}`);
      reset(); setShowCreate(false); loadSubAccounts();
    } catch { toast.error("Failed to create sub-account"); } finally { setCreating(false); }
  }

  async function doAction(subUserId: string, action: string, extra?: Record<string, unknown>) {
    setActionLoading(subUserId + action);
    try {
      const res = await fetch("/api/admin/sub-accounts", { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ userId: subUserId, action, ...extra }) });
      const json = await res.json() as { message?: string; error?: string };
      if (!res.ok) { toast.error(json.error || "Action failed"); return; }
      toast.success(json.message || "Done");
      loadSubAccounts(); setResetTarget(null); setResetPwd("");
    } catch { toast.error("Action failed"); } finally { setActionLoading(null); }
  }

  const accountType = session?.user.accountType || "Individual";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Users size={18} className="text-blue-700" /><span className="font-semibold text-gray-900 dark:text-gray-100">{subAccounts.length} sub-account{subAccounts.length !== 1 ? "s" : ""}</span></div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>{showCreate ? <X size={14} /> : <Plus size={14} />}{showCreate ? "Cancel" : "Add Member"}</Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Plus size={14} /> New {accountType} Member</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit(onCreate)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3"><Input label="First Name *" error={errors.firstName?.message} {...register("firstName")} /><Input label="Last Name *" error={errors.lastName?.message} {...register("lastName")} /></div>
              <Input label="Middle Name" {...register("middleName")} />
              <div className="grid grid-cols-2 gap-3"><Input label="Birthdate *" type="date" error={errors.birthdate?.message} {...register("birthdate")} /><Select label="Gender *" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} placeholder="Select" error={errors.gender?.message} {...register("gender")} /></div>
              <Input label="Mobile *" type="tel" placeholder="0712345678" error={errors.mobile?.message} {...register("mobile")} />
              <Input label="Email *" type="email" error={errors.email?.message} {...register("email")} />
              <Input label="Username *" placeholder="lowercase_only" error={errors.username?.message} {...register("username")} />
              <Input label="Password *" type={showPwd ? "text" : "password"} error={errors.password?.message} rightIcon={<button type="button" onClick={() => setShowPwd(!showPwd)}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>} {...register("password")} />
              <Select label="Nationality *" options={[{ value: "Tanzanian", label: "Tanzanian" }, { value: "Foreigner", label: "Foreigner" }]} placeholder="Select" error={errors.nationality?.message} {...register("nationality")} />
              {nationality === "Tanzanian" && <Input label="NIDA Number *" {...register("nidaNumber")} />}
              {nationality === "Foreigner" && <Input label="Passport Number *" {...register("passportNumber")} />}
              <Button type="submit" fullWidth loading={creating}>Create Member Account</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {resetTarget && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader><CardTitle className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2"><RefreshCw size={14} /> Reset Password for {resetTarget.firstName}</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">A reset OTP will be sent to the user's mobile.</div>
            <div className="flex gap-2">
              <Button size="sm" variant="warning" loading={actionLoading === resetTarget._id + "reset-password"} onClick={() => doAction(resetTarget._id, "reset-password")}>Send Reset Code</Button>
              <Button size="sm" variant="ghost" onClick={() => { setResetTarget(null); setResetPwd(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full" /></div>
      ) : subAccounts.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No sub-accounts yet. Add your first member above.</p></div>
      ) : (
        <div className="space-y-3">
          {subAccounts.map((user) => (
            <Card key={user._id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">{user.firstName[0]}{user.lastName[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500 font-mono">{user.profileId}</p>
                    <p className="text-xs text-gray-400">{user.mobile}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant={user.isActive ? "success" : "destructive"}>{user.isActive ? "Active" : "Locked"}</Badge>
                      <Badge variant={user.isAccountActive ? "default" : "warning"}>{user.isAccountActive ? "Paid" : "Pending"}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant={user.isActive ? "destructive" : "success"} loading={actionLoading === user._id + (user.isActive ? "lock" : "unlock")} onClick={() => doAction(user._id, user.isActive ? "lock" : "unlock")}>
                    {user.isActive ? <Lock size={12} /> : <Unlock size={12} />}{user.isActive ? "Lock" : "Unlock"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResetTarget(user)}><RefreshCw size={12} /> Reset Password</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
