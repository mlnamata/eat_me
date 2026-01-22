import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const logoPath = "/eatme_logo.png";
  const absoluteLogo = new URL(logoPath, base).toString();

  return NextResponse.json({
    base,
    logoPath,
    absoluteLogo,
    hints: {
      note: "Set NEXT_PUBLIC_SITE_URL in Vercel for correct absolute OG/Twitter images.",
      docs: "https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase",
    },
  });
}
