import { QrCode, Heart, Users, Shield, CreditCard, Smartphone } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Code Identity",
    description: "Every profile gets a unique QR code. Scan it to instantly view emergency information — no login required.",
    iconBg: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-700 dark:text-blue-400",
    accent: "border-t-blue-500",
  },
  {
    icon: Heart,
    title: "Emergency Health Info",
    description: "Store blood type, chronic conditions, treatment notes, and hospital details for life-saving decisions.",
    iconBg: "bg-rose-50 dark:bg-rose-950",
    iconColor: "text-rose-600 dark:text-rose-400",
    accent: "border-t-rose-500",
  },
  {
    icon: Users,
    title: "Family & Organizations",
    description: "Manage profiles for families, schools, businesses, and institutions — all under one admin account.",
    iconBg: "bg-emerald-50 dark:bg-emerald-950",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    accent: "border-t-emerald-500",
  },
  {
    icon: Shield,
    title: "Public & Private Fields",
    description: "Choose what's visible to the public and what stays private. You control your data.",
    iconBg: "bg-violet-50 dark:bg-violet-950",
    iconColor: "text-violet-700 dark:text-violet-400",
    accent: "border-t-violet-500",
  },
  {
    icon: CreditCard,
    title: "Printable ID Card",
    description: "Generate a print-ready ID card with your QR code, profile photo, and key details.",
    iconBg: "bg-amber-50 dark:bg-amber-950",
    iconColor: "text-amber-700 dark:text-amber-400",
    accent: "border-t-amber-500",
  },
  {
    icon: Smartphone,
    title: "Works Offline (PWA)",
    description: "Install directly from your browser. Works like a native app — no App Store needed.",
    iconBg: "bg-teal-50 dark:bg-teal-950",
    iconColor: "text-teal-700 dark:text-teal-400",
    accent: "border-t-teal-500",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-4">
            Everything in one place
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            Built for real emergencies
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            TAARIFA_ID combines identity, health, and emergency data in a secure,
            QR-code-powered digital profile.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`bg-white dark:bg-gray-900 rounded-2xl p-7 border-t-4 ${f.accent} shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-300 hover:-translate-y-1 group`}
            >
              <div className={`inline-flex p-3.5 rounded-2xl mb-5 ${f.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                <f.icon size={24} className={f.iconColor} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2.5">{f.title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
