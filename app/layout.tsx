import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revivio",
  description:
    "Import a Zillow listing, pull the room photos, and generate realistic redesigns or furniture staging concepts with AI.",
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
