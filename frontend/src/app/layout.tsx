import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BackgroundVideo from "@/components/BackgroundVideo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrustLens: AI Powered Scam, Fraud and Fake Job Detection Platform",
  description: "Detect Fake Jobs, Verify Recruiters, Protect Careers. Advanced AI-powered platform for detecting recruitment scams, verifying companies and recruiters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100 relative selection:bg-cyan-500/30 selection:text-cyan-200">
        <BackgroundVideo variant="ambient" />
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}

