import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { TransientStatusProvider } from "@/components/ui/transient-status";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Palermo Perfume System",
  description: "Discover fragrance with Palermo.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body><TransientStatusProvider>{children}</TransientStatusProvider></body>
    </html>
  );
}
