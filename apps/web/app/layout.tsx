import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "../components/layout/app-nav";

export const metadata: Metadata = {
  title: "2026 BDBV Dashboard",
  description: "Bundibugyo virus disease surveillance — NG/KE/UG",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-950 antialiased">
        <AppNav />
        <div className="mx-auto max-w-7xl px-4 py-4">{children}</div>
      </body>
    </html>
  );
}
