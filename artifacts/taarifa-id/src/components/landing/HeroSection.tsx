"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, QrCode, ArrowRight, Smartphone } from "lucide-react";

const slides = [
  {
    emoji: "🆔",
    title: "Your Digital Identity",
    subtitle: "One QR code carries your complete identity — always with you, on your phone or a card.",
  },
  {
    emoji: "🚨",
    title: "Emergency Ready",
    subtitle: "First responders scan your QR and instantly see your blood type, conditions, and emergency contacts.",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "For Families & Organizations",
    subtitle: "Register your family, school, business or institution under one account with full control.",
  },
  {
    emoji: "📱",
    title: "Works Like a Native App",
    subtitle: "Install TAARIFA_ID on your phone from your browser — no App Store needed.",
  },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm backdrop-blur">
              <Shield size={14} />
              <span>Tanzania&apos;s Digital Identity Platform</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Your life&apos;s critical info,{" "}
              <span className="text-yellow-300">one scan away</span>
            </h1>

            <p className="text-blue-100 text-lg leading-relaxed">
              TAARIFA_ID gives you a unique QR-linked profile with your health details,
              emergency contacts, and identity — printable as an ID card.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="bg-yellow-400 text-blue-900 hover:bg-yellow-300 font-bold">
                  Get Your ID Free <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-200">
              <Smartphone size={16} />
              <span>Install as a mobile app — no App Store needed</span>
            </div>
          </div>

          {/* Right: Feature cards */}
          <div className="grid grid-cols-2 gap-4">
            {slides.map((slide, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur rounded-2xl p-4 space-y-2 border border-white/20 hover:bg-white/15 transition-colors"
              >
                <span className="text-3xl">{slide.emoji}</span>
                <h3 className="font-semibold text-sm">{slide.title}</h3>
                <p className="text-xs text-blue-200 leading-relaxed">{slide.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
