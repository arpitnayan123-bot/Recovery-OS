"use client";

"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const inlineScale = (id: string, frameWidth: number) =>
  `(function(){var o=document.getElementById(${JSON.stringify(id)});if(!o)return;` +
  `var i=o.firstElementChild;if(!i)return;var w=o.clientWidth;if(!w)return;` +
  `var s=w/${frameWidth};i.style.transform='scale('+s+')';` +
  `i.style.setProperty('--frame-scale',String(s));` +
  `o.style.height=(i.offsetHeight*s)+'px';})()`;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export const ScaleFrame = ({
  frameWidth,
  className,
  children,
}: {
  frameWidth: number;
  className?: string;
  children: ReactNode;
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const baseDprRef = useRef<number | null>(null);
  const id = useId();
  const [measured, setMeasured] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const width = outer.clientWidth;
      if (!width) return;

      if (baseDprRef.current === null) {
        baseDprRef.current = window.devicePixelRatio || 1;
      }
      const zoom = (window.devicePixelRatio || 1) / baseDprRef.current;

      const scale = (width / frameWidth) * zoom;
      inner.style.transform = `scale(${scale})`;

      inner.style.setProperty("--frame-scale", String(scale));
      outer.style.height = `${inner.offsetHeight * scale}px`;

      const scaledWidth = frameWidth * scale;
      outer.style.overflowX = scaledWidth > width + 1 ? "auto" : "";
      inner.style.marginLeft =
        scaledWidth < width - 1 ? `${(width - scaledWidth) / 2}px` : "";

      setMeasured(true);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    measure();

    const dprWatch = window.matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );
    dprWatch.addEventListener("change", measure);

    return () => {
      observer.disconnect();
      dprWatch.removeEventListener("change", measure);
    };
  }, [frameWidth]);

  return (
    <>
      {}
      <div ref={outerRef} id={id} className={className} suppressHydrationWarning>
        <div
          ref={innerRef}
          suppressHydrationWarning
          style={
            {
              width: frameWidth,
              transformOrigin: "top left",
              "--frame-scale": 1,
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </div>
      {!measured && (
        <script dangerouslySetInnerHTML={{ __html: inlineScale(id, frameWidth) }} />
      )}
    </>
  );
};