import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import SessionWrapper from "@/components/layout/SessionWrapper";
import PWAInstallPrompt from "@/components/layout/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "TAARIFA_ID — Digital Identity Platform",
  description:
    "Tanzania's digital identity and emergency profile platform. Scan a QR code to access critical emergency information instantly.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TAARIFA_ID",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
  keywords: ["Tanzania", "identity", "emergency", "QR code", "digital ID", "Taarifa"],
  authors: [{ name: "Sunriver Systems" }],
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sw" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TAARIFA_ID" />
        <script src="/register-sw.js" defer></script>
      </head>
      <body>
        <SessionWrapper>
          {children}
          <PWAInstallPrompt />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "14px",
              },
            }}
          />
        </SessionWrapper>
      </body>
    </html>
  );
}
