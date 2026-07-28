"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, User, KeyRound } from "lucide-react";
import Link from "next/link";

interface Props {
  prefillIdentifier?: string;
}

export default function ResetPasswordForm({ prefillIdentifier }: Props) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(prefillIdentifier || "");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Reset failed");
        return;
      }
      toast.success("Password reset! Sign in with your new password.");
      router.push("/login");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-7 space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Mobile, Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          leftIcon={<User size={16} />}
          placeholder="Same as you entered before"
          required
        />

        <Input
          label="Reset Code"
          value={resetToken}
          onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ""))}
          leftIcon={<KeyRound size={16} />}
          placeholder="6-digit code from your SMS"
          maxLength={6}
          inputMode="numeric"
          hint="Check your SMS inbox"
          required
        />

        <Input
          label="New Password"
          type={showPwd ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          hint="Minimum 8 characters"
          required
        />

        <Input
          label="Confirm New Password"
          type={showPwd ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          required
        />

        <Button type="submit" fullWidth loading={loading} size="lg">
          Reset Password
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Didn&apos;t receive a code?{" "}
        <Link href="/forgot-password" className="text-blue-700 dark:text-blue-400 font-semibold hover:underline">
          Request again
        </Link>
      </p>
    </div>
  );
}
