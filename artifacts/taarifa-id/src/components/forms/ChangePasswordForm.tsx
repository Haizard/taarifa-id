"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to change password");
        return;
      }
      toast.success("Password changed successfully!");
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck size={32} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Password updated</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Your new password is active. Use it on your next login.
          </p>
        </div>
        <Button variant="outline" onClick={() => setDone(false)}>
          Change again
        </Button>
      </div>
    );
  }

  const toggleIcon = (
    <button
      type="button"
      onClick={() => setShowPwd(!showPwd)}
      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
    >
      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-7 space-y-4"
    >
      <div className="pb-2 border-b border-gray-100 dark:border-gray-800 mb-2">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-blue-700 dark:text-blue-400" />
          <h3 className="font-bold text-gray-900 dark:text-white text-base">Change Password</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Choose a strong password at least 8 characters long.
        </p>
      </div>

      <Input
        label="Current Password"
        type={showPwd ? "text" : "password"}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        leftIcon={<Lock size={16} />}
        rightIcon={toggleIcon}
        required
      />

      <Input
        label="New Password"
        type={showPwd ? "text" : "password"}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        leftIcon={<Lock size={16} />}
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
        <Lock size={16} /> Update Password
      </Button>
    </form>
  );
}
