import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eat Me - Denní menu restaurací",
  description: "AI-powered agregátor denních menu z vybraných restaurací",
  icons: {
    icon: "/eatme_logo.png",
  },
  // Nastavení absolutního základu URL pro správné OG/Twitter obrázky
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "Eat Me - Denní menu restaurací",
    description: "AI-powered agregátor denních menu z vybraných restaurací",
    images: ["/eatme_logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eat Me - Denní menu restaurací",
    description: "AI-powered agregátor denních menu z vybraných restaurací",
    images: ["/eatme_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
