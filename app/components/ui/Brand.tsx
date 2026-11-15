import type { CSSProperties, ReactNode } from "react";

export function BrandBackground({ className = "fixed inset-0 -z-10 transform-gpu" }: { className?: string }) {
  return (
    <div
      className={"cp-background-linear " + className}
      aria-hidden="true"
    />
  );
}

export function ChocolateDecoration() {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-50 w-full"
      style={{ top: "-40px" }}
      aria-hidden="true"
    >
      <ChocolateShape style={{ width: "100%", height: "clamp(130px, 22vh, 240px)" }} />
    </div>
  );
}

export function ChocolateShape({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={style} aria-hidden="true">
      <path d="M0 0 H100 V26 C95 32,92 26,88 26 C85 26,83 30,80 30 C77 30,75 26,72 26 C69 26,67 36,64 36 C61 36,59 24,56 24 C53 24,51 30,48 30 C45 30,43 26,40 26 C37 26,35 36,32 36 C29 36,27 26,24 26 C21 26,19 32,16 32 C13 32,11 24,8 24 C5 24,2 32,0 32 Z" fill="#3f2d00" />
    </svg>
  );
}

export function BrandBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cp-border)] bg-white px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[var(--cp-brand)] shadow-sm md:text-xs">
      {children}
    </span>
  );
}
