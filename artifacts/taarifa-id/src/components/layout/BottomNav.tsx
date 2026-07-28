"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, QrCode, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const role = (session.user as any)?.role;
  const profileId = (session.user as any)?.profileId;

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: `/profile/${profileId}`, label: "Profile", icon: User },
    { href: "/dashboard/qr", label: "QR Code", icon: QrCode },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  if (role === "system_admin") {
    navItems[0] = { href: "/system-admin", label: "Admin", icon: LayoutDashboard };
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-3 px-4 text-xs font-medium transition-all duration-200 flex-1 min-w-0",
                isActive
                  ? "text-blue-700 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-blue-700 dark:bg-blue-400" />
              )}
              <item.icon
                size={22}
                className={cn("transition-transform duration-200", isActive && "scale-110")}
              />
              <span className="truncate text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
