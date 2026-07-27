"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCOUNT_TYPES } from "@/lib/utils";
import { RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function MoveAccountForm() {
  const [targetProfileId, setTargetProfileId] = useState("");
  const [targetPassword, setTargetPassword] = useState("");
  const [targetAccountType, setTargetAccountType] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetProfileId || !targetPassword || !targetAccountType) {
      toast.error("All fields are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/move-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProfileId, targetPassword, targetAccountType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Move failed");
        return;
      }
      toast.success(data.message);
      setResultMsg(data.message);
      setDone(true);
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
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Account Moved</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{resultMsg}</p>
          <p className="text-xs text-gray-400">Please sign out and sign in again to see the changes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-2xl">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold">Moving your account</p>
          <p className="text-xs mt-1 opacity-80">
            You&apos;ll need the <strong>Profile ID</strong> and <strong>password</strong> of the
            destination account (e.g. the school or business admin). This action changes your
            account type and transfers you under that admin.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Destination Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <Select
            label="Move to Account Type"
            options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
            placeholder="Select destination type"
            value={targetAccountType}
            onChange={(e) => setTargetAccountType(e.target.value)}
          />

          <Input
            label="Destination Profile ID"
            value={targetProfileId}
            onChange={(e) => setTargetProfileId(e.target.value.toUpperCase())}
            placeholder="TID-XXXXXXXX"
            hint="Profile ID of the admin you are moving to"
          />

          <Input
            label="Destination Password"
            type={showPwd ? "text" : "password"}
            value={targetPassword}
            onChange={(e) => setTargetPassword(e.target.value)}
            hint="Password of the destination account holder"
            rightIcon={
              <button type="button" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
        </CardContent>
      </Card>

      <Button type="submit" fullWidth loading={loading} variant="warning">
        <RefreshCw size={16} /> Move Account
      </Button>
    </form>
  );
}
