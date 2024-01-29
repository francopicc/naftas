import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "naftas - precio de la nafta en tu mano",
  description: "Consegui los precios de la nafta mas cercanos a vos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-gray-50 text-gray-900"}>{children}</body>
    </html>
  );
}
