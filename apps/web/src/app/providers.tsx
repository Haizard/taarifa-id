'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '14px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' } }} />
    </QueryClientProvider>
  );
}
