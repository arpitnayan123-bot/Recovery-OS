import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PicoWidget } from "@/components/pico/pico-widget";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Recovery OS — Get paid what the law already owes you",
  description:
    "The automated payment-recovery engine for Indian MSMEs. Recovery OS watches every invoice, invokes MSMED Act interest, files claims on the government ODR portal, and collects your money — you pay only from what we recover.",
  keywords: [
    "MSME payment recovery",
    "MSMED Act",
    "overdue invoices India",
    "MSEFC claim",
    "ODR portal",
    "delayed payment interest",
    "B2B receivables",
  ],
  authors: [{ name: "Recovery OS" }],
  openGraph: {
    title: "Recovery OS — They had 45 days. It's day 214.",
    description:
      "Automated MSME payment recovery built on the MSMED Act, 2006. ₹8,00,000 crore is trapped in overdue B2B invoices. We go get it.",
    siteName: "Recovery OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recovery OS — Get paid what the law already owes you",
    description:
      "Automated MSME payment recovery built on the MSMED Act, 2006. Zero upfront. Paid only from what we recover.",
  },
};

export const viewport: Viewport = {
  themeColor: "#060807",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Recovery OS",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Automated MSME payment-recovery platform. Detects overdue invoices, invokes MSMED Act statutory interest, files MSEFC claims on the government ODR portal and pursues recovery to settlement.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "No upfront cost. Success fee charged only on money recovered.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${display.variable} ${inter.variable} ${mono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <PicoWidget />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
