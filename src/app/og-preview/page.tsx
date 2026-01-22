import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "OG Preview — Eat Me",
  description: "Preview of Open Graph image and metadata",
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

export default function OgPreviewPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-2xl font-bold">OG Preview</h1>
      <p className="text-gray-600">This page sets explicit Open Graph/Twitter metadata.</p>
      <div className="border rounded-xl p-4 bg-white shadow-sm">
        <Image src="/eatme_logo.png" alt="Eat Me Logo" width={320} height={320} className="object-contain w-64 h-64" />
      </div>
      <p className="text-sm text-gray-500">Share this page URL to test rich previews.</p>
    </main>
  );
}
