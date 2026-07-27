// SessionWrapper is no longer needed — auth is provided by AuthContext (SessionProvider in App.tsx).
// This file kept as a passthrough for any legacy references.
export default function SessionWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
