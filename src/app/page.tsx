"use client";

import { Preloader } from "@/components/site/preloader";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { Nav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { Problem } from "@/components/site/problem";
import { Law } from "@/components/site/law";
import { Product } from "@/components/site/product";
import { Calculator } from "@/components/site/calculator";
import { Pricing } from "@/components/site/pricing";
import { Faq } from "@/components/site/faq";
import { Cta } from "@/components/site/cta";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Preloader />
      <div className="theme-light min-h-screen bg-background text-foreground">
        <Nav />
        <main className="flex-1">
          <Hero />
          <Marquee />
          <Problem />
          <Law />
          <Product />
          <Calculator />
          <Pricing />
          <Faq />
          <Cta />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
}
