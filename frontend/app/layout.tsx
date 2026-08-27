import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { PwaBanner } from "@/components/ui/PwaBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://slipradar.app"),
  title: {
    default: "SlipRadar | Track every bet slip live",
    template: "%s | SlipRadar",
  },
  description:
    "Paste a booking code from SportyBet, Bet9ja, 1xBet or BetKing and watch every leg of your accumulator settle in real time, with instant goal alerts.",
  applicationName: "SlipRadar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SlipRadar",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "SlipRadar",
    title: "SlipRadar | Track every bet slip live",
    description:
      "One booking code. Every leg of your accumulator, live with instant alerts.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SlipRadar | Track every bet slip live",
    description:
      "One booking code. Every leg of your accumulator, live with instant alerts.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#090A0F" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-150">
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              {children}
              <PwaBanner />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
