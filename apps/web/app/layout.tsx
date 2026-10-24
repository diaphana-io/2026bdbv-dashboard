import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "../components/layout/app-nav";
import { ThemeProvider } from "../components/theme-provider";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "2026 BDBV Dashboard",
  description: "Bundibugyo virus disease surveillance — map-first",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
