"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const GOTO: Record<string, string> = {
  o: "/console",
  i: "/console/invoices",
  c: "/console/cases",
  b: "/console/buyers",
  a: "/console/analytics",
  s: "/console/insights",
  d: "/console/security",
  t: "/console/settings",
};

/**
 * Global keyboard navigation — `g` followed by a letter jumps to a page.
 * Ignores keys typed into inputs/textareas. Also exposes the map for the
 * shortcuts-help overlay.
 */
export function useKeyboardNav(enabled: boolean = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let prefix = false;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    const reset = () => {
      prefix = false;
      if (prefixTimer) clearTimeout(prefixTimer);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;
      // skip if a modifier is held (let cmd+k etc. through)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "g" && !prefix) {
        prefix = true;
        if (prefixTimer) clearTimeout(prefixTimer);
        prefixTimer = setTimeout(reset, 1200);
        return;
      }
      if (prefix && GOTO[e.key]) {
        e.preventDefault();
        router.push(GOTO[e.key]);
        reset();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (prefixTimer) clearTimeout(prefixTimer);
    };
  }, [enabled, router]);
}
