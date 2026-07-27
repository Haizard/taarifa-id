import { useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { authHeaders } from "@/contexts/AuthContext";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (currentPassword === newPassword) { toast.error("New password must be different from current password"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error || "Failed to change password"); return; }
      toast.success("Password changed successfully!");
      setDone(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck size={32} className="text-green-600" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Password Changed</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your password has been updated successfully.</p>
          <Button variant="outline" onClick={() => setDone(false)}>Change Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock size={16} /> Change Password</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <Input label="Current Password" type={showPwd ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          <Input label="New Password" type={showPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint="Minimum 8 characters" required />
          <Input label="Confirm New Password" type={showPwd ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} className="rounded" />
            Show passwords
          </label>
        </CardContent>
      </Card>
      <Button type="submit" fullWidth loading={loading}><Lock size={16} /> Update Password</Button>
    </form>
  );
}
