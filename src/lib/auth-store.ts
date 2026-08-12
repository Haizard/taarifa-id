'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SessionUser {
  sub: string;
  username: string;
  role: string;
  account_type: string;
  profile_id: string;
  mobile_number?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string, refreshToken: string, user: SessionUser) => void;
  setUser: (user: SessionUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'taarifa-auth' },
  ),
);
