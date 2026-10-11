import { cn } from "@/lib/utils";

/* ============================================================
   Recovery OS — Premium Logo
   The Recovery Shield: a shield silhouette (protection) with a
   rising arrow (recovery) cut through negative space. Gradient
   depth, glow, and refined typography. Pure SVG + CSS.
   ============================================================ */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        {/* primary gradient — deep green → bright mint (bottom → top = growth direction) */}
        <linearGradient id="rosShield" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#0c7a4b" />
          <stop offset="40%" stopColor="#1ab87a" />
          <stop offset="75%" stopColor="#2df09c" />
          <stop offset="100%" stopColor="#5ffcb8" />
        </linearGradient>
        {/* secondary gradient — for the arrow stroke */}
        <linearGradient id="rosArrow" x1="0.5" y1="1" x2="0.5" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
        </linearGradient>
        {/* glow filter */}
        <filter id="rosGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* clip path — so the arrow is cut from the shield (negative space) */}
        <clipPath id="rosShieldClip">
          {/* shield silhouette: flat top, curved sides, pointed bottom */}
          <path d="M24 4 L40 10 L40 26 Q40 36 24 44 Q8 36 8 26 L8 10 Z" />
        </clipPath>
      </defs>

      {/* shield body — filled with gradient */}
      <path
        d="M24 4 L40 10 L40 26 Q40 36 24 44 Q8 36 8 26 L8 10 Z"
        fill="url(#rosShield)"
        filter="url(#rosGlow)"
        className="ros-shield-body"
      />

      {/* rising arrow — cut from the shield using negative space (overlay in bg color) */}
      <g clipPath="url(#rosShieldClip)">
        {/* arrow shaft + head */}
        <path
          d="M24 36 L24 14 M24 14 L18 20 M24 14 L30 20"
          stroke="url(#rosArrow)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="ros-shield-arrow"
        />
      </g>

      {/* subtle inner highlight — top edge of shield */}
      <path
        d="M24 4 L40 10"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M24 4 L8 10"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* top vertex glow dot */}
      <circle cx="24" cy="4" r="1" fill="#5ffcb8" filter="url(#rosGlow)" className="ros-shield-vertex" />
    </svg>
  );
}

/**
 * Full logo: premium shield mark + "Recovery OS" wordmark.
 * No badge box — clean typography with gradient + letter-spacing.
 * tone="auto"   — follows theme tokens
 * tone="bright" — bright mint for dark surfaces
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
  const textColor = tone === "bright" ? "text-[#3df0a0]" : "text-mint";

  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <LogoMark className={cn("shrink-0", markClassName)} />
      {!compact && (
        <span className="flex items-baseline gap-[3px]">
          <span className="ros-wordmark font-display text-[1.1rem] font-semibold tracking-[-0.03em] text-current">
            Recovery
          </span>
          <span className={cn(
            "font-display text-[1.1rem] font-medium tracking-[0.04em]",
            textColor,
          )}>
            OS
          </span>
        </span>
      )}
    </span>
  );
}
