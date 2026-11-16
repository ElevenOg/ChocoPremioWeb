"use client";

import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import ChocolateBackground from "../../components/ChocolateBackground";
import AsyncMessage from "../../components/AsyncMessage";
import FeedbackDialog from "../../components/FeedbackDialog";
import GiftArt, { BOXES, prizeColor } from "../../components/ui/GiftArt";
import { Button } from "../../components/ui/Button";
import useBlockBackNavigation from "../../components/useBlockBackNavigation";
import { useResult } from "./useResult";
import styles from "../Experience.module.css";
import celebration from "./ResultCelebration.module.css";

const SPARKS = [-145, -115, -85, -55, -25, 15, 45, 75, 105, 135];

export default function Result() {
  useBlockBackNavigation();
  const { result, loading, error, retry, claim, submitting, actionError, introHref, finish } = useResult();
  if (error) return <ChocolateBackground><AsyncMessage message={error} onRetry={retry} href={introHref} /></ChocolateBackground>;
  if (loading || !result) return <ChocolateBackground><FeedbackDialog title="Recuperando tu sorpresa" description="Estamos preparando los datos de tu participación." loading standalone /></ChocolateBackground>;
  return <ChocolateBackground><section className={`${styles.card} ${styles.introEnter} ${celebration.card} ${result.won ? celebration.winner : ""}`} aria-busy={loading}>
    <div className={celebration.shine} aria-hidden="true" />
    <>
      <div className={`${styles.art} ${celebration.gift}`}>
        <GiftArt color={BOXES[(result.selected_box ?? 0) - 1]?.color ?? prizeColor(result.prize.type)} chocolate={result.prize.type === "big_discount"} discount={["small_discount", "medium_discount", "large_discount"].includes(result.prize.type)} />
        {result.won && <div className={celebration.confetti} aria-hidden="true">
          {SPARKS.map((x, index) => <i key={x} style={{ "--x": `${x}px`, "--peak": `${-55 - index % 3 * 16}px`, "--y": `${35 + index % 4 * 14}px`, "--turn": `${index % 2 ? 220 : -190}deg`, "--delay": `${index % 3 * 60}ms` } as CSSProperties} />)}
        </div>}
      </div>
      <h1 className={styles.title}>{result.prize.name || result.prize.title}</h1>
      <p className={styles.copy}>{result.won ? "Un detalle para hacer tu día más dulce." : "Gracias por participar en ChocoPremio."}</p>
      {result.prize.redemption_condition && <div className={styles.condition}><small>Para disfrutar tu regalo</small><p>{result.prize.redemption_condition}</p></div>}
      {actionError && <p role="alert" className={styles.error}>{actionError}</p>}
      <Button className={styles.button} onClick={result.won ? () => void claim() : finish} loading={submitting} disabled={submitting}>{result.won ? "MOSTRAR MI PREMIO" : "FINALIZAR"}<ArrowRight size={17} /></Button>
      <p className={styles.note}>{result.won ? "Muestra tu premio al personal del comercio para su validación." : "Esta participación ya ha terminado."}</p>
    </>
  </section></ChocolateBackground>;
}
