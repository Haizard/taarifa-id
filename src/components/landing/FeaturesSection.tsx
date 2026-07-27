import { QrCode, Heart, Users, Shield, CreditCard, Smartphone } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "QR Code Identity",
    description: "Every profile gets a unique QR code. Scan it to instantly view emergency information — no login required.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Heart,
    title: "Emergency Health Info",
    description: "Store blood type, chronic conditions, treatment notes, and hospital details for life-saving decisions.",
    color: "bg-red-50 text-red-700",
  },
  {
    icon: Users,
    title: "Family & Organizations",
    description: "Manage profiles for families, schools, businesses, and institutions — all under one admin account.",
    color: "bg-green-50 text-green-700",
  },
  {
    icon: Shield,
    title: "Public & Private Fields",
    description: "Choose what's visible to the public and what stays private. You control your data.",
    color: "bg-purple-50 text-purple-700",
  },
  {
    icon: CreditCard,
    title: "Printable ID Card",
    description: "Generate a print-ready ID card with your QR code, profile photo, and key details.",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: Smartphone,
    title: "Works Offline (PWA)",
    description: "Install on your phone directly from the browser. Works like a native app, no App Store needed.",
    color: "bg-teal-50 text-teal-700",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Everything you need in one platform
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            TAARIFA_ID combines identity, health, and emergency data in a secure,
            QR-code-powered digital profile.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className={`inline-flex p-3 rounded-xl mb-4 ${f.color}`}>
                <f.icon size={22} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
