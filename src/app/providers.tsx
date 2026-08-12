'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { PwaInstallButton } from '@/components/PwaInstallButton';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <QueryClientProvider client={client}>
      {children}
      <PwaInstallButton />
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '14px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' } }} />
    </QueryClientProvider>
  );
}
