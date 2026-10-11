"use client";

"use client";

import { useEffect, useState } from "react";
import Globe from "@/components/originkit/ui/hero-24/globe";

const ACCENT = "#00A1DB";

export const MediaGlobe = ({ query }: { query: string }) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  if (!matches) return null;

  return (
    <Globe
      scale={9.7}
      stopOnHover
      initialLatitude={23}
      initialLongitude={-23}
      fill="dots"
      dots={{ color: ACCENT, size: 5, density: 8, allDots: false }}
      showOutline
      outlineColor={ACCENT}
      showGrid
      graticuleColor={ACCENT}
      oceanColor="#101216"
      style={{ width: "100%", height: "100%" }}
    />
  );
};