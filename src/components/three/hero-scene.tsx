"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ---------------------------------- utils --------------------------------- */

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type CardVariant = "overdue" | "recovery" | "recovered";

function makeCardTexture(variant: CardVariant): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 288;
  c.height = 372;
  const ctx = c.getContext("2d")!;

  ctx.clearRect(0, 0, c.width, c.height);

  // card body
  roundedRectPath(ctx, 6, 6, 276, 360, 22);
  ctx.fillStyle = "#0b0e0c";
  ctx.fill();
  ctx.strokeStyle = "rgba(236,239,233,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // header row
  ctx.fillStyle = "#2df09c";
  ctx.beginPath();
  ctx.arc(34, 44, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(236,239,233,0.85)";
  ctx.font = "600 17px 'JetBrains Mono', monospace";
  ctx.fillText("INVOICE #4021", 50, 50);

  ctx.fillStyle = "rgba(236,239,233,0.38)";
  ctx.font = "13px 'JetBrains Mono', monospace";
  ctx.fillText("AMOUNT DUE", 32, 96);
  ctx.fillStyle = "#ecefe9";
  ctx.font = "700 34px 'Space Grotesk', sans-serif";
  ctx.fillText("₹4,20,000", 32, 132);

  // meta lines
  const rows: Array<[string, string]> = [
    ["BUYER", "Steelworks India Ltd."],
    ["DUE DATE", "14 Feb 2026"],
    ["AGE", "214 days"],
    ["INTEREST", "₹38,914 accrued"],
  ];
  let y = 186;
  for (const [k, v] of rows) {
    ctx.fillStyle = "rgba(236,239,233,0.34)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText(k, 32, y);
    ctx.fillStyle = "rgba(236,239,233,0.78)";
    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillText(v, 128, y);
    y += 40;
  }

  // status pill
  const pill = {
    overdue: { text: "OVERDUE · 214 DAYS", color: "#ff6b5e" },
    recovery: { text: "CLAIM FILED · MSEFC", color: "#f5b02e" },
    recovered: { text: "RECOVERED ₹4,58,914", color: "#2df09c" },
  }[variant];

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundedRectPath(ctx, 28, 322, 232, 34, 10);
  ctx.fill();
  ctx.strokeStyle = pill.color;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = pill.color;
  ctx.font = "600 14px 'JetBrains Mono', monospace";
  const tw = ctx.measureText(pill.text).width;
  ctx.fillText(pill.text, 28 + (232 - tw) / 2, 344);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(45,240,156,0.55)");
  g.addColorStop(0.35, "rgba(45,240,156,0.14)");
  g.addColorStop(1, "rgba(45,240,156,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* --------------------------------- pieces --------------------------------- */

function Rings() {
  const g1 = useRef<THREE.Group>(null);
  const g2 = useRef<THREE.Group>(null);
  const g3 = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (g1.current) g1.current.rotation.z = t * 0.1;
    if (g2.current) g2.current.rotation.z = -t * 0.06;
    if (g3.current) g3.current.rotation.z = t * 0.16;
    if (marker.current) {
      const a = t * 0.42;
      marker.current.position.set(Math.cos(a) * 3.35, Math.sin(a) * 3.35, 0);
    }
  });

  return (
    <group>
      <group ref={g1} rotation={[Math.PI / 2.5, 0.2, 0]}>
        <mesh>
          <torusGeometry args={[2.7, 0.011, 12, 180]} />
          <meshBasicMaterial color="#2df09c" transparent opacity={0.75} />
        </mesh>
        <mesh ref={marker} position={[3.35, 0, 0]}>
          <octahedronGeometry args={[0.075, 0]} />
          <meshBasicMaterial color="#eafff4" />
        </mesh>
      </group>
      <group ref={g2} rotation={[Math.PI / 1.9, -0.35, 0.4]}>
        <mesh>
          <torusGeometry args={[3.35, 0.007, 12, 200]} />
          <meshBasicMaterial color="#2df09c" transparent opacity={0.3} />
        </mesh>
      </group>
      <group ref={g3} rotation={[Math.PI / 3.4, 0.5, -0.3]}>
        <mesh>
          <torusGeometry args={[2.05, 0.016, 12, 160]} />
          <meshBasicMaterial color="#eafff4" transparent opacity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

function InvoiceCards() {
  const group = useRef<THREE.Group>(null);

  const { textures, cards } = useMemo(() => {
    const variants: CardVariant[] = ["overdue", "recovery", "recovered"];
    const textures = variants.map(makeCardTexture);
    const cards = [
      { p: [-3.9, 0.9, -1.2], s: 1.18, v: 0, r: 0.16, sp: 0.55, ph: 0 },
      { p: [3.7, 1.4, -0.6], s: 1.05, v: 1, r: -0.2, sp: 0.7, ph: 1.4 },
      { p: [-2.6, -1.7, 0.8], s: 0.92, v: 2, r: -0.12, sp: 0.62, ph: 2.8 },
      { p: [2.8, -1.5, 0.4], s: 1.12, v: 0, r: 0.22, sp: 0.5, ph: 4.1 },
      { p: [-4.8, -0.4, -2.4], s: 1.0, v: 1, r: 0.1, sp: 0.66, ph: 5.2 },
      { p: [4.6, -0.2, -1.8], s: 0.95, v: 2, r: -0.14, sp: 0.58, ph: 0.7 },
      { p: [0.2, 2.6, -2.8], s: 1.08, v: 0, r: -0.05, sp: 0.6, ph: 3.3 },
      { p: [-0.4, -2.9, -1.6], s: 0.88, v: 1, r: 0.18, sp: 0.72, ph: 1.9 },
    ];
    return { textures, cards };
  }, []);

  const meshes = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // on narrow (portrait) screens, spread cards outward to keep the copy legible
    const spreadX = state.viewport.aspect < 1 ? 1.5 : 1;
    const spreadY = state.viewport.aspect < 1 ? 1.28 : 1;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      const c = cards[i];
      m.position.y = c.p[1] * spreadY + Math.sin(t * c.sp + c.ph) * 0.22;
      m.position.x = c.p[0] * spreadX + Math.cos(t * c.sp * 0.6 + c.ph) * 0.08;
      m.rotation.z = c.r + Math.sin(t * c.sp + c.ph) * 0.03;
      m.rotation.y = Math.sin(t * 0.3 + c.ph) * 0.12;
    });
  });

  return (
    <group ref={group}>
      {cards.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          position={c.p}
          scale={c.s}
        >
          <planeGeometry args={[1.15, 1.4875]} />
          <meshBasicMaterial
            map={textures[c.v]}
            transparent
            opacity={0.96}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ count = 700 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4.5 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.022}
        color="#9df5cf"
        transparent
        opacity={0.55}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.24, 2.2, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.12, 2.2, dt);
  });
  return <group ref={ref}>{children}</group>;
}

/* ---------------------------------- scene --------------------------------- */

export function HeroScene({ active }: { active: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [dpr, setDpr] = useState(1.5);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setDpr(Math.min(window.devicePixelRatio || 1, 1.75));
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!mounted) return null;

  return (
    <Canvas
      frameloop={active ? "always" : "demand"}
      dpr={dpr}
      camera={{ position: [0, 0.35, 9.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <fog attach="fog" args={["#060807", 9.5, 19]} />
      <Rig>
        <Rings />
        <InvoiceCards />
        <Dust />
      </Rig>
      <GlowBackdrop />
    </Canvas>
  );
}

function GlowBackdrop() {
  const tex = useMemo(() => makeGlowTexture(), []);
  return (
    <sprite position={[0, -0.4, -4]} scale={[11, 11, 1]}>
      <spriteMaterial
        map={tex}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}
