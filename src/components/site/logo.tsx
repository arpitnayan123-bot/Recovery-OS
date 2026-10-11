import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
    >
      <rect
        x="7"
        y="7"
        width="34"
        height="34"
        rx="10"
        stroke="currentColor"
        strokeWidth="2.8"
      />
      <circle cx="14.5" cy="33.5" r="2.1" fill="currentColor" />
      <path
        d="M14.5 33.5 L 21.5 25.5 L 26.5 29.5 L 34.5 19.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 27.8 20.6 L 34.5 19.5 L 33.3 26.2"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * tone="auto"   — follows theme tokens (deep green on light, bright mint on dark scopes)
 * tone="bright" — hard bright-mint, for dark surfaces nested inside the light scope
 *                 (e.g. the fixed nav floating over the cinematic hero)
 */
export function Logo({
  className,
  markClassName,
  compact = false,
  tone = "auto",
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
  tone?: "auto" | "bright";
}) {
  const accent = tone === "bright" ? "text-[#3df0a0]" : "text-mint";
  const badge =
    tone === "bright"
      ? "text-[#3df0a0] border-[#3df0a0]/35"
      : "text-mint border-mint/35";

  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark className={cn(accent, markClassName)} />
      {!compact && (
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[1.15rem] font-semibold tracking-tight text-current">
            Recovery
          </span>
          <span
            className={cn(
              "font-mono text-[0.72rem] font-medium border rounded-md px-1.5 py-0.5 leading-none translate-y-[-1px]",
              badge
            )}
          >
            OS
          </span>
        </span>
      )}
    </span>
  );
}
