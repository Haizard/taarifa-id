"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, User, MessageSquare } from "lucide-react";
import Link from "next/link";

interface LoginFormProps {
  isFirstLogin?: boolean;
  prefillMobile?: string;
}

export default function LoginForm({ isFirstLogin, prefillMobile }: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [username, setUsername] = useState(prefillMobile || "");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [firstLogin] = useState(isFirstLogin || false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password: firstLogin ? "firstlogin" : password,
        otpCode: firstLogin ? otpCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials. Please try again.");
        return;
      }

      toast.success("Signed in successfully!");

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (role === "system_admin") {
        router.push("/system-admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-800 p-7">
      {firstLogin && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
          <MessageSquare size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">First login verification</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
              Enter the 6-digit code sent to your phone to verify your account.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Username, Mobile or Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          leftIcon={<User size={16} />}
          placeholder="e.g. john_doe or 0712345678"
          autoComplete="username"
          required
        />

        {firstLogin ? (
          <Input
            label="Verification Code (OTP)"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="Enter 6-digit code"
            maxLength={6}
            inputMode="numeric"
            leftIcon={<MessageSquare size={16} />}
            required
          />
        ) : (
          <div className="space-y-1.5">
            <Input
              label="Password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="current-password"
              required
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
          {firstLogin ? "Verify & Sign In" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
