import { useState } from "react";
import { useLocation, Link } from "wouter";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, User } from "lucide-react";

export default function ResetPasswordForm() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const [identifier, setIdentifier] = useState(params.get("identifier") || "");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, token: resetToken, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error || "Reset failed"); return; }
      toast.success("Password reset! Please sign in with your new password.");
      navigate("/login");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4">
      <Input label="Mobile, Email or Username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} leftIcon={<User size={16} />} placeholder="Same as you entered before" required />
      <Input label="Reset Code (6 digits)" value={resetToken} onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ""))} leftIcon={<Lock size={16} />} placeholder="Enter the 6-digit code" maxLength={6} required />
      <Input label="New Password" type={showPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} rightIcon={<button type="button" onClick={() => setShowPwd(!showPwd)}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>} hint="At least 8 characters" required />
      <Input label="Confirm New Password" type={showPwd ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
      <Button type="submit" fullWidth loading={loading}>Reset Password</Button>
      <p className="text-center text-sm text-gray-500">Didn&apos;t receive a code?{" "}<Link href="/forgot-password" className="text-blue-700 hover:underline">Try again</Link></p>
    </form>
  );
}
