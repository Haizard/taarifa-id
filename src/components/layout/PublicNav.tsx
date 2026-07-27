"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">TID</span>
          </div>
          <div>
            <span className="font-bold text-gray-900 dark:text-gray-100">TAARIFA</span>
            <span className="font-bold text-blue-700">_ID</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/#features" className="text-gray-600 hover:text-blue-700 transition-colors">Features</Link>
          <Link href="/#partners" className="text-gray-600 hover:text-blue-700 transition-colors">Partners</Link>
          <Link href="/#stats" className="text-gray-600 hover:text-blue-700 transition-colors">Stats</Link>
          <Link href="/register">
            <Button size="sm">Register</Button>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="outline">Login</Button>
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 pb-4">
          <nav className="flex flex-col gap-3 pt-3 text-sm font-medium">
            <Link href="/#features" onClick={() => setOpen(false)} className="py-2 text-gray-600 hover:text-blue-700">Features</Link>
            <Link href="/#partners" onClick={() => setOpen(false)} className="py-2 text-gray-600 hover:text-blue-700">Partners</Link>
            <Link href="/#stats" onClick={() => setOpen(false)} className="py-2 text-gray-600 hover:text-blue-700">Stats</Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button fullWidth>Register</Button>
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button fullWidth variant="outline">Login</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
