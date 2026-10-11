"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ros-console-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? (saved as "dark" | "light") : "dark";
  });

  // apply theme class to <html> + persist (synchronizes external DOM state)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("console-light");
    else root.classList.remove("console-light");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "group relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:border-mint/40 hover:text-mint",
        className,
      )}
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4 transition-transform group-hover:scale-110" />
      ) : (
        <Sun className="h-4 w-4 transition-transform group-hover:scale-110" />
      )}
      {/* subtle indicator dot */}
      <span
        className={cn(
          "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-card transition-colors",
          theme === "dark" ? "bg-mint" : "bg-flare",
        )}
      />
    </button>
  );
}
