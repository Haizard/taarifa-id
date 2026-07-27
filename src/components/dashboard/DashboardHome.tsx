"use client";

import Link from "next/link";
import { Session } from "next-auth";
import {
  User, QrCode, FileText, Settings, Heart, MapPin,
  AlertCircle, Phone, Briefcase, Shield, ChevronRight,
  CheckCircle, XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  session: Session;
}

const profileSections = [
  { href: "/dashboard/profile-edit?section=basic", icon: User, label: "Basic Details", color: "text-blue-600 bg-blue-50" },
  { href: "/dashboard/profile-edit?section=health", icon: Heart, label: "Health Info", color: "text-red-600 bg-red-50" },
  { href: "/dashboard/profile-edit?section=residence", icon: MapPin, label: "Residence", color: "text-green-600 bg-green-50" },
  { href: "/dashboard/profile-edit?section=emergency", icon: Phone, label: "Emergency Contacts", color: "text-orange-600 bg-orange-50" },
  { href: "/dashboard/profile-edit?section=desperate", icon: AlertCircle, label: "Medical Conditions", color: "text-rose-600 bg-rose-50" },
  { href: "/dashboard/profile-edit?section=employment", icon: Briefcase, label: "Employment", color: "text-purple-600 bg-purple-50" },
  { href: "/dashboard/qr", icon: QrCode, label: "My QR Code", color: "text-teal-600 bg-teal-50" },
  { href: "/dashboard/print", icon: FileText, label: "Print ID Card", color: "text-amber-600 bg-amber-50" },
];

export default function DashboardHome({ session }: Props) {
  const user = session.user as any;
  const isActive = user.isAccountActive;
  const accountType = user.accountType;
  const isReseller = accountType !== "Individual";

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {(user.name || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                  {user.name}
                </h2>
                {isReseller && (
                  <Badge variant="warning" className="shrink-0">RESELLER</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                {user.profileId}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant={isActive ? "success" : "destructive"}>
                  {isActive ? (
                    <><CheckCircle size={10} className="mr-1" /> Active</>
                  ) : (
                    <><XCircle size={10} className="mr-1" /> Inactive</>
                  )}
                </Badge>
                <Badge variant="secondary">{accountType}</Badge>
              </div>
            </div>
          </div>

          {!isActive && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-xl text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Shield size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Account not yet activated</p>
                <p className="text-xs mt-0.5">Your profile is pending payment activation. Your QR code will become active once confirmed.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-1">
          Profile Sections
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {profileSections.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow active:scale-[0.98]">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${item.color}`}>
                      <item.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {item.label}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Admin section */}
      {isReseller && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-1">
            Admin Actions
          </h3>
          <Card>
            <CardContent className="pt-5 space-y-3">
              <Link href="/dashboard/sub-accounts">
                <Button variant="outline" fullWidth className="justify-between">
                  Manage Sub-Accounts <ChevronRight size={16} />
                </Button>
              </Link>
              <Link href="/dashboard/sms">
                <Button variant="outline" fullWidth className="justify-between">
                  Send SMS to Members <ChevronRight size={16} />
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button variant="outline" fullWidth className="justify-between">
                  Organization Settings <ChevronRight size={16} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
