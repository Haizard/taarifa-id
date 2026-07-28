"use client";

import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  className?: string;
  noPadding?: boolean;
}

export default function AppShell({ children, title, showBack, className, noPadding }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col">
      <TopBar title={title} showBack={showBack} />
      <main
        className={cn(
          "flex-1 w-full max-w-2xl mx-auto",
          !noPadding && "px-4 py-5",
          "pb-28 md:pb-8",
          className
        )}
      >
        <div className="page-transition">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
