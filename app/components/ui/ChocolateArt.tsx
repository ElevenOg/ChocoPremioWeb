"use client";

import { useId, type SVGProps } from "react";

export default function ChocolateArt(props: SVGProps<SVGSVGElement>) {
  const id = useId();
  return <svg viewBox="0 0 100 112" aria-hidden="true" focusable="false" {...props}>
    <defs>
      <linearGradient id={`${id}-cocoa`} x2="1" y2="1">
        <stop stopColor="#845037" /><stop offset="1" stopColor="#40251e" />
      </linearGradient>
    </defs>
    <rect x="16" y="7" width="70" height="96" rx="8" fill="#382018" />
    <rect x="12" y="4" width="70" height="94" rx="7" fill={`url(#${id}-cocoa)`} />
    {[0, 1, 2].map(row => [0, 1].map(col => <g key={`${row}-${col}`} transform={`translate(${20 + col * 29} ${12 + row * 28})`}>
      <rect width="25" height="24" rx="3" fill="#3e241c" />
      <path d="M2 2H23L19 6H6V18L2 22Z" fill="#ad7954" />
      <path d="M6 6H19V18H6Z" fill="#74452e" />
      <path d="M6 18H19L23 22H2Z" fill="#512e22" />
    </g>))}
    <path d="M18 8H76" stroke="#d19c70" strokeOpacity=".6" strokeLinecap="round" />
  </svg>;
}
