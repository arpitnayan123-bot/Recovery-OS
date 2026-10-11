"use client";

import { useEffect, useState } from "react";
import Hero24 from "@/components/originkit/hero-24";

/**
 * Marketing hero — Originkit "Hero 24" section (cinematic backdrop, live globe,
 * hand cutouts, glass cards) carrying the Recovery OS copy. Mount is gated on
 * the boot preloader so the Originkit reveal choreography plays in view.
 */
export function Hero() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("ros-booted")) {
      const raf = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(raf);
    }
    // preloader lifts at 1.25s — mount just after so reveals start as it slides
    const t = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    // silhouette that holds layout height while the boot curtain is up
    return <div aria-hidden="true" className="min-h-[100svh] w-full bg-[#101216]" />;
  }

  return <Hero24 />;
}
