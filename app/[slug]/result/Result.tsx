"use client";

import { memo } from "react";
import ChocolateBackground from "../../components/ChocolateBackground";
import ChocolateLoader from "../../components/ChocolateLoader";
import useBlockBackNavigation from "../../components/useBlockBackNavigation";
import { useResult } from "./useResult";
import { prizeStyles, prizePresentation, hexToRgba } from "./resultUtils";
import styles from "./Result.module.css";

interface PrizeGlyphProps {
  emoji: string;
  size: number;
}

const PrizeGlyph = memo(function PrizeGlyph({ emoji, size }: PrizeGlyphProps) {
  if (emoji === "🍫") {
    return (
      <img
        src="/images/choco.webp"
        alt="Chocolate"
        draggable={false}
        decoding="async"
        style={{ width: size, height: "auto", userSelect: "none", pointerEvents: "none" }}
      />
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>;
});

export default function Result() {
  useBlockBackNavigation();

  const {
    loading,
    show,
    result,
    submitting,
    handleFinish,
    handleRetry,
    handleClaim
  } = useResult();

  // El loader se sostiene hasta que la tarjeta ya montó (show === true),
  // así el fade-out del loader coincide con el fade-in del contenido.
  if (loading || !result || !show) {
    return <ChocolateLoader isVisible={true} />;
  }

  const config = prizeStyles[result.prize.type];
  const presentation = prizePresentation[result.prize.type];
  const isLose = result.prize.type === "lose";
  const isRetry = result.prize.type === "retry";

  return (
    <ChocolateBackground>
      <div className={styles.card}>
        {!isLose && <div className={styles.halo} style={{ background: presentation.halo }} />}

        <div
          className={`${styles.iconBox} ${isLose ? styles.iconLose : styles.iconWin}`}
          style={{
            background: config.bg,
            boxShadow: isLose
              ? "0 10px 24px rgba(0,0,0,0.12)"
              : `0 14px 36px ${hexToRgba(presentation.ring, 0.4)}`
          }}
        >
          <PrizeGlyph emoji={result.prize.emoji} size={60} />
        </div>

        <h1
          className={`${styles.title} ${styles.fadeUp} ${styles.delay1}`}
          style={{ color: config.color }}
        >
          {isLose ? "¡Sigue participando!" : isRetry ? "¡Tienes otra oportunidad!" : "¡Felicidades!"}
        </h1>

        <h2 className={`${styles.subtitle} ${styles.fadeUp} ${styles.delay2}`}>
          {result.prize.title}
        </h2>

        <p className={`${styles.prize} ${styles.fadeUp} ${styles.delay3}`}>
          {result.prize.name}
        </p>

        <div className={`${styles.buttonWrap} ${styles.fadeUp} ${styles.delay4}`}>
          {isLose ? (
            <button
              disabled={submitting}
              className={styles.button}
              style={{ background: "#707070", opacity: submitting ? 0.7 : 1 }}
              onClick={handleFinish}
            >
              {submitting ? "UN MOMENTO" : "FINALIZAR"}
            </button>
          ) : isRetry ? (
            <button
              disabled={submitting}
              className={styles.button}
              style={{ background: config.bg, opacity: submitting ? 0.7 : 1 }}
              onClick={handleRetry}
            >
              {submitting ? "PREPARANDO" : "VOLVER A INTENTAR"}
            </button>
          ) : (
            <button
              disabled={submitting}
              className={`${styles.button} ${styles.buttonClaim}`}
              style={{ background: config.bg, opacity: submitting ? 0.7 : 1 }}
              onClick={handleClaim}
            >
              {!submitting && <span className={styles.buttonShine} aria-hidden="true" />}
              <span className={styles.buttonLabel}>
                {submitting ? "UN MOMENTO" : "RECLAMAR PREMIO"}
              </span>
            </button>
          )}
        </div>
      </div>
    </ChocolateBackground>
  );
}