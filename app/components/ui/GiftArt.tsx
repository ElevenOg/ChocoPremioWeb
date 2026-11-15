"use client";

import { useId } from "react";
import ChocolateArt from "./ChocolateArt";
import styles from "./GiftArt.module.css";

export type GiftColor = "rose" | "jade" | "amber" | "violet";

export const BOXES: { color: GiftColor; name: string }[] = [
 { color: "rose", name: "Rosa" }, { color: "jade", name: "Esmeralda" },
 { color: "amber", name: "Dorada" }, { color: "violet", name: "Violeta" },
];

export function prizeColor(type: string): GiftColor {
 return type === "small_discount" ? "rose" : type === "medium_discount" ? "jade" : type === "large_discount" ? "amber" : "violet";
}

export default function GiftArt({color="amber", open=false, chocolate=false, discount=false, className=""}: {color?: GiftColor; open?: boolean; chocolate?: boolean; discount?: boolean; className?: string}) {
 const id=useId();
 const revealed = chocolate || discount;
 return <svg viewBox={revealed ? "-15 -35 254 250" : "0 0 224 215"} aria-hidden="true" focusable="false" className={`${styles.gift} ${styles[color]} ${open ? styles.open : ""} ${revealed ? styles.revealed : ""} ${className}`}><defs>
<linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffffff" stopOpacity=".07"/><stop offset="1" stopColor="#160914" stopOpacity=".25"/></linearGradient>
<linearGradient id={`${id}-top`} x1="0" y1="0" x2=".6" y2="1"><stop stopColor="#ffffff" stopOpacity=".2"/><stop offset="1" stopColor="#ffffff" stopOpacity="0"/></linearGradient>
<linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2=".5"><stop stopColor="#b98a3f"/><stop offset=".35" stopColor="#f5d993"/><stop offset=".62" stopColor="#fff0c0"/><stop offset="1" stopColor="#c49b50"/></linearGradient>

</defs><ellipse className={styles.ground} cx="115" cy="194" rx="77" ry="9"/>
<path d="m39 84 73-26 73 26-73 25Z" fill="#291d22" stroke="var(--box-dark)" strokeWidth="3"/>
{chocolate && <g transform="rotate(12 123 72)"><ChocolateArt x="86" y="-21" width="80" height="136" /></g>}
{discount && !chocolate && <g transform="rotate(12 128 55)">
  <path d="M94-14h68q6 0 6 6v65a9 9 0 0 0 0 18v36q0 6-6 6H94q-6 0-6-6V75a9 9 0 0 0 0-18V-8q0-6 6-6Z" fill="#b98a3f" />
  <path d="M93-8h69v67a8 8 0 0 0 0 14v36H93V73a8 8 0 0 0 0-14Z" fill="#fff0c5" />
  <path d="M101 0h53v51h-53Z" fill="var(--box-dark)" />
  <g fill="none" stroke="#ffe5a0" strokeWidth="4" strokeLinecap="round">
    <circle cx="116" cy="15" r="5" /><circle cx="139" cy="36" r="5" />
    <path d="m115 39 25-27" />
  </g>
  <path d="M101 66h53" stroke="#b98a3f" strokeWidth="2" strokeDasharray="3 4" />
  <path d="M109 81h37m-31 9h25" stroke="#a16a29" strokeWidth="3" strokeLinecap="round" />
</g>}
<path d="M39 84 112 109 185 84 185 164 112 194 39 164Z" fill="var(--box-mid)"/>
<path d="m112 109 73-25v80l-73 30Z" fill="var(--box-side)"/>
<path d="m39 84 73 25v85l-73-30Z" fill="var(--box-mid)"/>
<path d="m39 84 73 25v85l-73-30Z" fill={`url(#${id}-front)`}/>
<path d="m66 94 19 7v82l-19-8Z" fill={`url(#${id}-ribbon)`}/>
<path d="m141 98 18-6v83l-18 8Z" fill={`url(#${id}-ribbon)`} opacity=".9"/>
<path d="m43 115 69 24 69-26" fill="none" stroke="#fff" strokeOpacity=".07"/>
<path d="m42 162 70 28 70-28M112 114v73" fill="none" stroke="#fff" strokeOpacity=".1"/>
<path d="m96 152 8 3v9l-8-3Z" fill="#e3c586" opacity=".75"/>
<g className={styles.lid}>
<path d="m30 66 82-29 82 29-82 31Z" fill="var(--box-light)"/>
<path d="m30 66 82-29 82 29-82 31Z" fill={`url(#${id}-top)`}/>
<path d="m30 66 82 31v17L30 83Z" fill="var(--box-mid)"/>
<path d="m112 97 82-31v17l-82 31Z" fill="var(--box-dark)"/>
<path d="m30 83 82 31 82-31v5l-82 31-82-31Z" fill="#1b0d18" opacity=".15"/>
<path d="m59 56 19-7 86 28-20 8Z" fill={`url(#${id}-ribbon)`}/>
<path d="m60 77 20 7 84-29-20-7Z" fill={`url(#${id}-ribbon)`}/>
<path d="m60 77 20 7v17l-20-8Zm84 8 20-8v17l-20 8Z" fill={`url(#${id}-ribbon)`}/>
<path d="M111 65C72 57 68 22 89 28c13 4 20 22 22 37Z" fill={`url(#${id}-ribbon)`} stroke="#ffe6a8" strokeWidth="1"/>
<path d="M108 59C90 49 79 33 88 34c7 1 15 15 20 25Z" fill="#92602d" opacity=".65"/>
<path d="M112 65c9-41 44-47 39-26-3 13-25 22-39 26Z" fill={`url(#${id}-ribbon)`} stroke="#ffe6a8" strokeWidth="1"/>
<path d="M120 58c9-18 25-26 24-18-1 5-16 14-24 18Z" fill="#92602d" opacity=".6"/>
<path d="m105 61-14 26 13-3 7 9 7-28Z" fill={`url(#${id}-ribbon)`}/>
<path d="m115 61 19 19-13 2-1 9-12-26Z" fill={`url(#${id}-ribbon)`}/>
<path d="M107 57q7-4 13 2l-2 11q-7 3-13-2Z" fill={`url(#${id}-ribbon)`}/>
<path d="m33 66 79 29 79-29" fill="none" stroke="#fff" strokeOpacity=".23"/>
</g>{revealed && <g fill="#e3be6b"><path d="m177 7 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path d="m65 18 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>}</svg>;
}
