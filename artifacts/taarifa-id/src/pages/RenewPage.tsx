import { useParams } from "wouter";
import { Link } from "wouter";
import { AlertCircle, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RenewPage() {
  const { profileId } = useParams<{ profileId: string }>();

  return (
    <div className="min-h-dvh bg-gradient-to-br from-amber-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle size={32} className="text-amber-600 dark:text-amber-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Expired</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            This TAARIFA_ID profile (<span className="font-mono">{profileId}</span>) has expired.
            Please contact Sunriver Systems to renew your subscription.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-left space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Sunriver Systems</p>
          <a href="tel:+255000000000" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <Phone size={16} /> +255 000 000 000
          </a>
          <a href="mailto:info@sunriver.co.tz" className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <Mail size={16} /> info@sunriver.co.tz
          </a>
        </div>
        <Link href="/login">
          <Button variant="outline" fullWidth>Sign In to Renew</Button>
        </Link>
      </div>
    </div>
  );
}
