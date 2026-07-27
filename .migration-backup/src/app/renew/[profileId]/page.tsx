import Link from "next/link";
import { AlertCircle, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ profileId: string }>;
}

export default async function RenewPage({ params }: Props) {
  const { profileId } = await params;
  return (
    <div className="min-h-dvh bg-white dark:bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={40} className="text-amber-600" />
        </div>

        {/* Brand */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">TID</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            TAARIFA<span className="text-blue-700">_ID</span>
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Profile Expired
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
            The profile <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{profileId}</span> has
            expired. Please contact Sunriver Systems to renew your subscription.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 space-y-3 text-sm">
          <p className="font-semibold text-gray-900 dark:text-gray-100">Contact Sunriver Systems</p>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone size={14} />
            <span>+255 XXX XXX XXX</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Mail size={14} />
            <span>info@sunriversystems.co.tz</span>
          </div>
        </div>

        <div className="space-y-2">
          <Link href="/login">
            <Button fullWidth>Sign In to Renew</Button>
          </Link>
          <Link href="/">
            <Button fullWidth variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
