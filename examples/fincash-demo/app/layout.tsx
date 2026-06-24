import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinCash — Smart Finance for Modern Business",
  description: "Automate your finances, grow your wealth. The all-in-one financial platform built for ambitious teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
