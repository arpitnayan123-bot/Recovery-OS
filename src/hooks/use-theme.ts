"use client";

import { useEffect, useState } from "react";

/**
 * Detects the active console theme by observing the `console-light` class
 * on <html>. Returns "light" or "dark" so chart components can pick the
 * right axis/tooltip/grid colors. Re-renders on theme change.
 */
export function useTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setTheme(root.classList.contains("console-light") ? "light" : "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
