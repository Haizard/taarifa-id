"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

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
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-5 text-center">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto">
          <span className="text-2xl">✅</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Code Sent!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            A 6-digit reset code has been sent to{" "}
            {maskedMobile ? (
              <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{maskedMobile}</span>
            ) : (
              "your registered mobile number"
            )}
            . It expires in 15 minutes.
          </p>
        </div>
        <Button
          fullWidth
          onClick={() =>
            router.push(
              `/reset-password?identifier=${encodeURIComponent(identifier)}`
            )
          }
        >
          Enter Reset Code
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4"
    >
      <Input
        label="Mobile, Email or Username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        leftIcon={<User size={16} />}
        placeholder="e.g. 0712345678 or john_doe"
        required
      />
      <Button type="submit" fullWidth loading={loading}>
        Send Reset Code
      </Button>
    </form>
  );
}
