import type { ReactNode } from "react";
import { ChocolateShape } from "./ui/Brand";
import GiftArt from "./ui/GiftArt";
import ChocolateArt from "./ui/ChocolateArt";
import styles from "./ChocolateBackground.module.css";

export default function ChocolateBackground({ children }: { children: ReactNode }) {
  return <div className={styles.background}>
    <div className={styles.topGlow} aria-hidden="true" />
    <div className={styles.bottomGlow} aria-hidden="true" />
    <ChocolateShape style={{ position:"absolute", top:-40, left:0, width:"100%", height:"clamp(130px,22vh,240px)", zIndex:2, filter:"drop-shadow(0 12px 25px #00000040)", pointerEvents:"none" }} />
    <div className={styles.floating1} aria-hidden="true"><GiftArt color="rose" /></div>
    <div className={styles.floating2} aria-hidden="true"><ChocolateArt /></div>
    <div className={styles.bubble1} aria-hidden="true" /><div className={styles.bubble2} aria-hidden="true" />
    <div className={styles.content}>{children}</div>
  </div>;
}
