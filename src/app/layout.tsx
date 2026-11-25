import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import PwaRegister from "./PwaRegister";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700"] });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "KAISH GOLDEN SPICES", template: "%s | KAISH GOLDEN SPICES" },
  description: "Billing and stock management for KAISH GOLDEN SPICES",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "KGS Billing", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#14342B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh antialiased">{children}<PwaRegister /></body>
    </html>
  );
}
