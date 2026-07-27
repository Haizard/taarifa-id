import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="space-y-5 max-w-sm">
        <div className="text-8xl font-black text-blue-100 dark:text-blue-950">404</div>
        <div className="flex items-center justify-center gap-2 -mt-8">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">TID</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            TAARIFA<span className="text-blue-700">_ID</span>
          </span>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          This page doesn&apos;t exist or the profile QR code has expired.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
