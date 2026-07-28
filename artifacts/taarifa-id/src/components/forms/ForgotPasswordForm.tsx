"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, CheckCircle, ArrowRight, MessageSquare } from "lucide-react";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [maskedMobile, setMaskedMobile] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your mobile, email or username");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      setSent(true);
      setMaskedMobile(data.maskedMobile || "");
      toast.success("Reset code sent!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Code sent!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            A 6-digit reset code has been sent to{" "}
            {maskedMobile ? (
              <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{maskedMobile}</span>
            ) : (
              "your registered mobile number"
            )}
            . It expires in 15 minutes.
          </p>
        </div>
        <Button
          fullWidth
          size="lg"
          onClick={() => router.push(`/reset-password?identifier=${encodeURIComponent(identifier)}`)}
        >
          Enter Reset Code <ArrowRight size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-7">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl mb-6">
        <MessageSquare size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
          We&apos;ll send a 6-digit reset code to the mobile number linked to your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Mobile, Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          leftIcon={<User size={16} />}
          placeholder="e.g. 0712345678 or john_doe"
          required
        />
        <Button type="submit" fullWidth loading={loading} size="lg">
          Send Reset Code
        </Button>
      </form>
    </div>
  );
}
