import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "../components/layout/app-nav";

export const metadata: Metadata = {
  title: "2026 BDBV Dashboard",
  description: "Bundibugyo virus disease surveillance — map-first",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-950 antialiased">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
