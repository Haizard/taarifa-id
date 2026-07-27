"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, User, CheckCircle, Send } from "lucide-react";

interface SubUser { _id: string; firstName: string; lastName: string; mobile: string; isActive: boolean }
interface Props { session: Session }

export default function SMSSender({ session }: Props) {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendAll, setSendAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/sub-accounts")
      .then((r) => r.json())
      .then((d) => setSubUsers(d.subAccounts || []))
      .catch(() => toast.error("Failed to load members"))
      .finally(() => setLoading(false));
  }, []);

  const activeUsers = subUsers.filter((u) => u.isActive);
  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { toast.error("Message is empty"); return; }
    const recipients = sendAll ? "all" : selectedIds;
    if (!sendAll && selectedIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, recipients }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }
      toast.success(data.message);
      setResult({ sent: data.sent, failed: data.failed, total: data.total });
      setMessage("");
      setSelectedIds([]);
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-5">
      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-2xl">
        <MessageSquare size={18} className="text-blue-700 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold">Send SMS to your members</p>
          <p className="text-xs mt-0.5 opacity-80">
            Messages are delivered via Beem Africa to registered mobile numbers.
          </p>
        </div>
      </div>

      {/* Recipients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users size={14} /> Recipients
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSendAll(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                sendAll
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Users size={14} /> All Active ({activeUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setSendAll(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                !sendAll
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <User size={14} /> Select
            </button>
          </div>

          {!sendAll && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
              ) : activeUsers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No active members</p>
              ) : (
                activeUsers.map((u) => {
                  const selected = selectedIds.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => toggleSelect(u._id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                        selected
                          ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                          : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{u.mobile}</p>
                      </div>
                      {selected && <CheckCircle size={16} className="text-blue-700 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {!sendAll && selectedIds.length > 0 && (
            <Badge variant="default">{selectedIds.length} selected</Badge>
          )}
        </CardContent>
      </Card>

      {/* Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare size={14} /> Message
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <textarea
            rows={5}
            maxLength={480}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message to members..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors resize-none"
            required
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{charCount} / 480 characters</span>
            <span>{smsCount} SMS credit{smsCount > 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-2xl">
          <CheckCircle size={18} className="text-green-600 shrink-0" />
          <div className="text-sm text-green-800 dark:text-green-200">
            <p className="font-semibold">SMS delivered to {result.sent} of {result.total} members</p>
            {result.failed > 0 && (
              <p className="text-xs mt-0.5">{result.failed} failed</p>
            )}
          </div>
        </div>
      )}

      <Button type="submit" fullWidth loading={sending}>
        <Send size={16} />
        {sendAll ? `Send to All (${activeUsers.length})` : `Send to ${selectedIds.length} Selected`}
      </Button>
    </form>
  );
}
