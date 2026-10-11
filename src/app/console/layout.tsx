import type { Metadata } from "next";
import { Providers } from "@/components/console/providers";
import { Shell } from "@/components/console/shell";

export const metadata: Metadata = {
  title: "Recovery OS — Console",
  description: "The live recovery console: invoices, statutory notices, evidence packs and ODR cases.",
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  );
}
