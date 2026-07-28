"use client";

import Link from "next/link";
import { Session } from "next-auth";
import {
  User, QrCode, FileText, Settings, Heart, MapPin,
  AlertCircle, Phone, Briefcase, Shield, ChevronRight,
  CheckCircle, XCircle, Crown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  session: Session;
}

const profileSections = [
  { href: "/dashboard/profile-edit?section=basic",      icon: User,         label: "Basic Details",       iconBg: "bg-blue-100 dark:bg-blue-950",    iconColor: "text-blue-700 dark:text-blue-400" },
  { href: "/dashboard/profile-edit?section=health",     icon: Heart,        label: "Health Info",         iconBg: "bg-rose-100 dark:bg-rose-950",    iconColor: "text-rose-600 dark:text-rose-400" },
  { href: "/dashboard/profile-edit?section=residence",  icon: MapPin,       label: "Residence",           iconBg: "bg-emerald-100 dark:bg-emerald-950", iconColor: "text-emerald-700 dark:text-emerald-400" },
  { href: "/dashboard/profile-edit?section=emergency",  icon: Phone,        label: "Emergency Contacts",  iconBg: "bg-orange-100 dark:bg-orange-950", iconColor: "text-orange-600 dark:text-orange-400" },
  { href: "/dashboard/profile-edit?section=desperate",  icon: AlertCircle,  label: "Medical Conditions",  iconBg: "bg-red-100 dark:bg-red-950",      iconColor: "text-red-600 dark:text-red-400" },
  { href: "/dashboard/profile-edit?section=employment", icon: Briefcase,    label: "Employment",          iconBg: "bg-violet-100 dark:bg-violet-950", iconColor: "text-violet-700 dark:text-violet-400" },
  { href: "/dashboard/qr",                              icon: QrCode,       label: "My QR Code",          iconBg: "bg-teal-100 dark:bg-teal-950",    iconColor: "text-teal-700 dark:text-teal-400" },
  { href: "/dashboard/print",                           icon: FileText,     label: "Print ID Card",       iconBg: "bg-amber-100 dark:bg-amber-950",  iconColor: "text-amber-700 dark:text-amber-400" },
];

export default function DashboardHome({ session }: Props) {
  const user = session.user as any;
  const isActive = user.isAccountActive;
  const accountType = user.accountType;
  const isReseller = accountType !== "Individual";
  const initials = (user.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">
      {/* Profile hero card */}
      <div className="rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
        {/* Gradient top */}
        <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 px-5 pt-5 pb-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)" }} />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-white text-lg truncate">{user.name}</h2>
                {isReseller && (
                  <Badge variant="warning" className="shrink-0 text-[10px]">
                    <Crown size={9} className="mr-1" /> ADMIN
                  </Badge>
                )}
              </div>
              <p className="text-blue-200/70 text-xs font-mono mt-0.5">{user.profileId}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"}`}>
                  {isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {isActive ? "Active" : "Inactive"}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70">
                  {accountType}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* White bottom strip */}
        <div className="bg-white dark:bg-gray-900 px-5 py-3 border border-gray-100 dark:border-gray-800 border-t-0 rounded-b-2xl -mt-2">
          {!isActive ? (
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Account not yet activated</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pending payment activation. Your QR code will go live once confirmed.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your profile is active and QR code is live.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile sections */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">
          Profile Sections
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {profileSections.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${item.iconBg} shrink-0`}>
                  <item.icon size={18} className={item.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">
                    {item.label}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin actions */}
      {isReseller && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">
            Admin Actions
          </h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
            {[
              { href: "/dashboard/sub-accounts", label: "Manage Sub-Accounts" },
              { href: "/dashboard/sms",           label: "Send SMS to Members" },
              { href: "/dashboard/settings",       label: "Organization Settings" },
            ].map((item, i, arr) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${i < arr.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""}`}
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</span>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
