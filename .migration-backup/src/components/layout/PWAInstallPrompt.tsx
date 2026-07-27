"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // iOS detection
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // Already dismissed
    const dismissed = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissed) return;

    if (ios) {
      // Show iOS-specific instructions
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Chrome / Android — capture event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setShowBanner(false);
    localStorage.setItem("pwa-prompt-dismissed", "1");
  }

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 border border-white/10">
        <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install TAARIFA_ID</p>
          {isIOS ? (
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
              Tap the <strong>Share</strong> button in Safari, then{" "}
              <strong>&quot;Add to Home Screen&quot;</strong> to install.
            </p>
          ) : (
            <p className="text-xs text-gray-300 mt-0.5">
              Add to your home screen for a native app experience — no App Store needed.
            </p>
          )}
          {!isIOS && deferredPrompt && (
            <Button
              size="sm"
              className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
              onClick={handleInstall}
            >
              Install App
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="p-1 text-gray-400 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
