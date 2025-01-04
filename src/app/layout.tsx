import type { Metadata } from "next"
import { GeistSans } from 'geist/font/sans';

import "./globals.css";

export const metadata: Metadata = {
  title: "Naftas - Precios del combustible",
  description: "Precios del combustible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={GeistSans.className}>{children}</body>
    </html>
  );
}
