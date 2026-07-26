import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3001";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "GMD — Interactive Equity Research",
    description:
      "A top-down equity research project linking Vietnam trade, container throughput, GMD earnings and valuation.",
    icons: {
      icon: "/og.png",
      shortcut: "/og.png",
    },
    openGraph: {
      title: "GMD: Vietnam Export Recovery",
      description:
        "Interactive Equity Research — Macro → TEU → Earnings → Valuation",
      type: "website",
      images: [`${origin}/og.png`],
    },
    twitter: {
      card: "summary_large_image",
      title: "GMD: Vietnam Export Recovery",
      description: "Interactive Equity Research — BUY • VND 84,500",
      images: [`${origin}/og.png`],
    },
  };
}

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
