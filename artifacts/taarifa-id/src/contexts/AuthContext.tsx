import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface SessionUser {
  id: string;
  name: string;
  role: string;
  profileId: string;
  accountType: string;
  isAccountActive: boolean;
}

export interface Session {
  user: SessionUser;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  login: (
    username: string,
    password: string,
    otpCode?: string
  ) => Promise<{ error?: string; requiresOTP?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem("tid_token");
    const stored = localStorage.getItem("tid_user");
    if (token && stored) {
      try {
        const user = JSON.parse(stored) as SessionUser;
        setSession({ user });
      } catch {
        localStorage.removeItem("tid_token");
        localStorage.removeItem("tid_user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (
      username: string,
      password: string,
      otpCode?: string
    ): Promise<{ error?: string; requiresOTP?: boolean }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, otpCode }),
        });
        const data = await res.json() as {
          token?: string; user?: SessionUser; error?: string; requiresOTP?: boolean;
        };
        if (!res.ok) return { error: data.error, requiresOTP: data.requiresOTP };
        localStorage.setItem("tid_token", data.token!);
        localStorage.setItem("tid_user", JSON.stringify(data.user));
        setSession({ user: data.user! });
        return {};
      } catch {
        return { error: "Network error. Please try again." };
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("tid_token");
    localStorage.removeItem("tid_user");
    setSession(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Helper: get stored token for API calls */
export function getAuthToken(): string | null {
  return localStorage.getItem("tid_token");
}

/** Helper: build authenticated fetch headers */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
