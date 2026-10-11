import { cn } from "@/lib/utils";

/* ============================================================
   Recovery OS — Premium Animated Logo
   SVG mark with gradient strokes, draw-in animation, pulsing
   data point, shimmer sweep, and glow. Pure CSS (no JS needed).
   ============================================================ */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8 ros-logo-mark", className)}
    >
      <defs>
        {/* gradient for the chart line — mint to bright-green */}
        <linearGradient id="rosLogoLine" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#2df09c" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#2df09c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5ffcb8" stopOpacity="1" />
        </linearGradient>
        {/* gradient for the chip border */}
        <linearGradient id="rosLogoChip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2df09c" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#2df09c" stopOpacity="0.15" />
        </linearGradient>
        {/* glow filter */}
        <filter id="rosLogoGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* chip body — rounded square with gradient border */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="11"
        stroke="url(#rosLogoChip)"
        strokeWidth="2"
        fill="none"
        className="ros-logo-chip"
      />

      {/* inner subtle fill */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="11"
        fill="#2df09c"
        fillOpacity="0.04"
        className="ros-logo-fill"
      />

      {/* rising chart line — draws in on mount */}
      <path
        d="M13 34 L 20 26 L 25 29 L 35 16"
        stroke="url(#rosLogoLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#rosLogoGlow)"
        className="ros-logo-line"
      />

      {/* arrow tip — subtle pulse */}
      <path
        d="M 28.5 17 L 35 16 L 33.5 22.5"
        stroke="url(#rosLogoLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#rosLogoGlow)"
        className="ros-logo-arrow"
      />

      {/* starting data point — pulsing dot */}
      <circle cx="13" cy="34" r="2.2" fill="#2df09c" className="ros-logo-dot" />
      {/* ending data point — peak */}
      <circle cx="35" cy="16" r="2.5" fill="#5ffcb8" filter="url(#rosLogoGlow)" className="ros-logo-dot-peak" />

      {/* shimmer sweep overlay */}
      <rect
        x="6"
        y="6"
        width="36"
        height="36"
        rx="11"
        fill="white"
        fillOpacity="0"
        className="ros-logo-shimmer"
      >
        <animate
          attributeName="fill-opacity"
          values="0;0;0.06;0.06;0"
          keyTimes="0;0.3;0.5;0.7;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}

/**
 * Full logo: animated mark + "Recovery" wordmark with gradient + "OS" badge.
 * tone="auto"   — follows theme tokens
 * tone="bright" — hard bright-mint for dark surfaces
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
          <span className="ros-logo-wordmark font-display text-[1.15rem] font-semibold tracking-tight text-current">
            Recovery
          </span>
          <span
            className={cn(
              "ros-logo-badge font-mono text-[0.72rem] font-medium border rounded-md px-1.5 py-0.5 leading-none translate-y-[-1px]",
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
