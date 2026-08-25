import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloudflare Kumo Admin Control Panel | Sports Live Feeds Hub",
  description: "Administrative orchestrator, ingestion rate telemetry, and financial hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0D13] text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
