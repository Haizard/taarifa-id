import Link from "next/link";
import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center">
                <span className="text-white text-xs font-black">TID</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                TAARIFA<span className="text-amber-400">_ID</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs text-gray-500">
              Tanzania&apos;s digital identity and emergency profile platform. One QR code, all your critical information.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <Shield size={12} className="text-emerald-400" />
              <span className="text-gray-500">Your data is encrypted and private</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-3 text-sm">
              {[["/#features", "Features"], ["/#partners", "Partners"], ["/#stats", "Stats"], ["/register", "Get Started"], ["/login", "Sign In"]].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account types */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Account Types</h4>
            <ul className="space-y-3 text-sm">
              {["Individual", "Family", "School", "Business", "Institution"].map((t) => (
                <li key={t}>
                  <Link href="/register" className="hover:text-white transition-colors">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} TAARIFA_ID. All rights reserved.</p>
          <p>
            Designed &amp; Built by{" "}
            <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sunriver Systems
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
