import type { Metadata } from "next";
import { googleFontsUrl } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personalised Resource Builder",
  description: "Design once, personalise for every fundraiser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Every font in src/lib/fonts.ts; the browser only downloads the ones a page uses */}
        <link href={googleFontsUrl()} rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
