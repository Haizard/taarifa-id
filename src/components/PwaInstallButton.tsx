'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (isIOS()) setShow(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || !show) return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setShow(false);
      } else {
        setDeferred(null);
        setShow(false);
      }
      return;
    }
    toast('On iPhone/iPad tap Share → Add to Home Screen to install TAARIFA ID', { duration: 5000 });
  };

  return (
    <button
      type="button"
      onClick={install}
      aria-label="Install TAARIFA ID app"
      className="pwa-install-btn fixed right-4 top-16 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary px-4 py-2.5 text-[14px] font-semibold text-white shadow-glass"
    >
      <Download size={16} />
      Install App
    </button>
  );
}
