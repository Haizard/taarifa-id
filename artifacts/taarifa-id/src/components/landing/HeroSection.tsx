"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, QrCode, ArrowRight, Smartphone, Heart, Users } from "lucide-react";

const floatingCards = [
  {
    icon: QrCode,
    iconBg: "bg-blue-500",
    title: "Your Digital Identity",
    sub: "One QR code. Always with you.",
  },
  {
    icon: Heart,
    iconBg: "bg-rose-500",
    title: "Emergency Ready",
    sub: "Blood type, contacts, conditions.",
  },
  {
    icon: Users,
    iconBg: "bg-emerald-500",
    title: "Families & Orgs",
    sub: "One admin, many profiles.",
  },
  {
    icon: Smartphone,
    iconBg: "bg-violet-500",
    title: "Works Offline",
    sub: "Install like a native app.",
  },
];

export default function HeroSection() {
  return (
    <section className="hero-bg min-h-screen flex items-center pt-16">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-8">
              <Shield size={12} className="text-amber-400" />
              Tanzania&apos;s Digital Identity Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight">
              Your life&apos;s<br />
              critical info,<br />
              <span className="gradient-text">one scan away</span>
            </h1>

            <p className="mt-6 text-lg text-blue-100/80 leading-relaxed max-w-md">
              TAARIFA_ID gives you a unique QR-linked profile with your health details, emergency contacts, and identity — printable as an ID card.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="xl" variant="amber" className="text-base">
                  Get Your ID Free
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="xl"
                  className="text-base bg-white/10 border border-white/20 text-white hover:bg-white/20 shadow-none"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-blue-200/60 text-sm flex items-center gap-2">
              <Smartphone size={14} />
              Install as a mobile app — no App Store needed
            </p>
          </div>

          {/* Right: floating feature cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {floatingCards.map((card, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-5 hover:bg-white/12 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <card.icon size={20} className="text-white" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{card.title}</h3>
                <p className="text-blue-100/60 text-xs leading-relaxed">{card.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile cards scroll */}
        <div className="lg:hidden mt-12 grid grid-cols-2 gap-3">
          {floatingCards.map((card, i) => (
            <div key={i} className="glass-card rounded-2xl p-4">
              <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <card.icon size={18} className="text-white" />
              </div>
              <h3 className="text-white font-semibold text-xs mb-1">{card.title}</h3>
              <p className="text-blue-100/60 text-xs leading-relaxed">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 dark:from-gray-950 to-transparent" />
    </section>
  );
}
