import { Link, useLocation } from "wouter";
import { Home, User, QrCode, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/contexts/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export default function BottomNav() {
  const [pathname] = useLocation();
  const { session } = useSession();

  if (!session) return null;

  const role = session.user.role;
  const profileId = session.user.profileId;

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 md:hidden">
      <div
        className="flex items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-3 px-5 text-xs font-medium transition-colors min-w-0 relative",
                isActive
                  ? "text-blue-700 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
              )}
            >
              <item.icon
                size={22}
                className={cn("transition-transform", isActive && "scale-110")}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-blue-700 dark:bg-blue-400 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
