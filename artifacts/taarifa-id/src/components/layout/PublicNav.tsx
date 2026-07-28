"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-[0_2px_16px_rgba(0,0,0,0.08)] border-b border-gray-100 dark:border-gray-800"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(30,58,138,0.35)] group-hover:shadow-[0_4px_12px_rgba(30,58,138,0.45)] transition-shadow">
              <span className="text-white text-xs font-black tracking-tight">TID</span>
            </div>
            <span className={`font-bold text-lg tracking-tight transition-colors ${scrolled ? "text-gray-900 dark:text-white" : "text-white"}`}>
              TAARIFA<span className="text-amber-400">_ID</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className={`hidden md:flex items-center gap-1 text-sm font-medium transition-colors ${scrolled ? "text-gray-600 dark:text-gray-300" : "text-white/80"}`}>
            {[["#features", "Features"], ["#partners", "Partners"], ["#stats", "Stats"]].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className={`px-4 py-2 rounded-xl transition-colors ${
                  scrolled
                    ? "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
                    : "hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/login">
              <Button
                variant={scrolled ? "ghost" : "white"}
                size="sm"
                className={!scrolled ? "text-blue-900 font-semibold" : ""}
              >
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" variant={scrolled ? "default" : "amber"}>
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2.5 rounded-xl transition-colors ${
              scrolled
                ? "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 shadow-lg">
          <nav className="flex flex-col gap-1 p-4">
            {[["#features", "Features"], ["#partners", "Partners"], ["#stats", "Stats"]].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" fullWidth size="sm">Login</Button>
              </Link>
              <Link href="/register" className="flex-1" onClick={() => setOpen(false)}>
                <Button fullWidth size="sm">Register</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
