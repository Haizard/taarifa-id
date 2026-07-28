import LoginForm from "@/components/forms/LoginForm";
import Link from "next/link";
import { Shield, QrCode, Heart, Zap } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ firstLogin?: string; mobile?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-dvh flex">
      {/* Brand panel — left */}
      <div className="hidden lg:flex lg:w-1/2 auth-brand-panel flex-col justify-between p-12 relative">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">TID</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              TAARIFA<span className="text-amber-400">_ID</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-black text-white leading-tight">
              Your digital identity,<br />
              <span className="text-amber-400">always with you.</span>
            </h2>
            <p className="mt-4 text-blue-100/70 text-base leading-relaxed">
              One QR code carries your emergency info, health details, and identity — ready to scan anywhere, anytime.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: QrCode, label: "Unique QR code profile" },
              { icon: Heart, label: "Emergency health info on scan" },
              { icon: Shield, label: "Private data you control" },
              { icon: Zap, label: "Works offline as a native app" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-amber-400" />
                </div>
                <span className="text-blue-100/80 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-100/40 text-xs">
            © {new Date().getFullYear()} TAARIFA_ID · Sunriver Systems
          </p>
        </div>
      </div>

      {/* Form panel — right */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-gray-50 dark:bg-gray-950">
        {/* Mobile logo */}
        <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center">
            <span className="text-white text-xs font-black">TID</span>
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">
            TAARIFA<span className="text-blue-700">_ID</span>
          </span>
        </Link>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Sign in to your TAARIFA_ID account
            </p>
          </div>

          <LoginForm
            isFirstLogin={params.firstLogin === "1"}
            prefillMobile={params.mobile}
          />

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-700 dark:text-blue-400 font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
