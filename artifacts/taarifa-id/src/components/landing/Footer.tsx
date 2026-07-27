import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><span className="text-white text-xs font-bold">TID</span></div>
              <span className="text-white font-bold">TAARIFA_ID</span>
            </div>
            <p className="text-sm leading-relaxed">Tanzania&apos;s digital identity and emergency profile platform.</p>
            <p className="text-xs text-gray-500">Powered by Sunriver Systems</p>
          </div>
          <div className="space-y-3">
            <h4 className="text-white text-sm font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-white transition-colors">Register</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><a href="/#features" className="hover:text-white transition-colors">Features</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-white text-sm font-semibold">Account Types</h4>
            <ul className="space-y-2 text-sm">
              {["Individual", "Family", "School", "Business", "Institution"].map((t) => (
                <li key={t}><Link href={`/register?type=${t}`} className="hover:text-white transition-colors">{t}</Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-white text-sm font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>info@sunriversystems.co.tz</li>
              <li>+255 XXX XXX XXX</li>
              <li>Dar es Salaam, Tanzania</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>© {new Date().getFullYear()} TAARIFA_ID. All rights reserved.</p>
          <p>Designed & Built by <a href="#" className="text-blue-400 hover:text-blue-300">Sunriver Systems</a></p>
        </div>
      </div>
    </footer>
  );
}
