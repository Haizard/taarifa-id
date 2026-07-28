"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export default function TopBar({ title, showBack }: TopBarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  if (!session) return null;

  const displayTitle = title || "TAARIFA_ID";

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-[0_1px_8px_rgba(0,0,0,0.05)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5">
          {showBack ? (
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-black">TID</span>
              </div>
            </Link>
          )}
          <h1 className="font-bold text-gray-900 dark:text-gray-100 text-base truncate max-w-[180px]">
            {displayTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-all"
            aria-label="Sign out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
