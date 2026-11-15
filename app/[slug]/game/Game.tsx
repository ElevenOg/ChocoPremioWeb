"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ChocolateBackground from "../../components/ChocolateBackground";
import AsyncMessage from "../../components/AsyncMessage";
import GiftArt, { BOXES, prizeColor } from "../../components/ui/GiftArt";
import { Button } from "../../components/ui/Button";
import useBlockBackNavigation from "../../components/useBlockBackNavigation";
import { playSound, preloadSounds, startGameMelody } from "../../components/AudioManager";
import useErrorSound from "../../components/useErrorSound";
import { chooseGameBox } from "@/lib/client/gameApi";
import { errorMessage, requestJson } from "@/lib/client/api";
import type { ResultData } from "@/lib/game/types";
import shared from "../Experience.module.css";
import styles from "./Game.module.css";

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

export default function Game() {
  useBlockBackNavigation();
  const { slug } = useParams<{ slug: string }>();
  const sessionId = useSearchParams().get("session");
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [stage, setStage] = useState<"charging" | "settling" | "openingLid">("charging");
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState("");
  useErrorSound(error);
  const choosing = useRef(false);
  const alive = useRef(true);
  const animation = useRef<AbortController | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);
  const stopMusic = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (checking || error || selected !== null || !sessionId) return;
    const stop = startGameMelody();
    stopMusic.current = stop;
    return () => { stop(); stopMusic.current = null; };
  }, [checking, error, selected, sessionId]);

  useEffect(() => {
    if (selected !== null || error || !sessionId) return;
    const boxes = Array.from(grid.current?.querySelectorAll<HTMLElement>(`.${styles.boxArt}`) ?? []);
    if (boxes.length < 2) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    let previous = -1;
    const clear = () => {
      clearTimeout(timer);
      boxes.forEach(box => box.classList.remove(styles.shaking));
    };
    const shake = () => {
      clear();
      if (document.hidden || motion.matches) return;
      // A different box moves each time; this is only decoration.
      const candidates = boxes.map((_, index) => index).filter(index => index !== previous);
      previous = candidates[Math.floor(Math.random() * candidates.length)];
      boxes[previous].classList.add(styles.shaking);
      timer = setTimeout(shake, 1250);
    };
    shake();
    document.addEventListener("visibilitychange", shake);
    motion.addEventListener("change", shake);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", shake);
      motion.removeEventListener("change", shake);
    };
  }, [selected, error, sessionId]);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; animation.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    requestJson<{ played: boolean; has_result: boolean }>("/api/session/state?sessionId=" + encodeURIComponent(sessionId) + "&slug=" + encodeURIComponent(slug), { signal: controller.signal })
      .then((state) => {
        if (controller.signal.aborted) return;
        if (state.has_result) { router.replace("/" + slug + "/result?session=" + encodeURIComponent(sessionId)); return; }
        if (!state.played) { router.replace("/" + slug); return; }
        setChecking(false);
      }).catch((cause) => { if (!controller.signal.aborted) { setError(errorMessage(cause)); setChecking(false); } });
    router.prefetch("/" + slug + "/result");
    return () => controller.abort();
  }, [sessionId, slug, router, attempt]);

  const choose = async (box: number) => {
    if (!sessionId || choosing.current || checking) return;
    choosing.current = true;
    stopMusic.current?.();
    const controller = new AbortController(); animation.current = controller;
    const reduced = selected !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSelected(box); setStage("charging"); setError("");
    preloadSounds(); playSound("select");
    const outcome = chooseGameBox(slug, sessionId, box).then((value) => {
      if (alive.current && !controller.signal.aborted) setResult(value);
      return { value, error: null };
    }, (cause: unknown) => {
      if (alive.current && !controller.signal.aborted) {
        choosing.current = false; setStage("settling"); setError(errorMessage(cause)); controller.abort();
      }
      return { value: null, error: cause };
    });
    await wait(reduced ? 0 : 2200, controller.signal);
    if (!alive.current || controller.signal.aborted) return;
    setStage("settling");
    const [response] = await Promise.all([outcome, wait(reduced ? 0 : 1100, controller.signal)]);
    if (!alive.current || controller.signal.aborted) return;
    if (!response.value) {
      choosing.current = false;
      setError(errorMessage(response.error));
      return;
    }
    setResult(response.value); setStage("openingLid");
    if (!reduced) playSound("reveal");
    if (!reduced) navigator.vibrate?.(35);
    await wait(reduced ? 0 : 1300, controller.signal);
    if (alive.current && !controller.signal.aborted) router.replace("/" + slug + "/result?session=" + encodeURIComponent(sessionId));
  };

  if (!sessionId) return <ChocolateBackground><AsyncMessage message="Falta la sesión de juego." href={"/" + slug} /></ChocolateBackground>;
  if (error && selected === null) return <ChocolateBackground><AsyncMessage message={error} href={"/" + slug} onRetry={() => { playSound("click"); setError(""); setChecking(true); setAttempt((value) => value + 1); }} /></ChocolateBackground>;
  if (selected !== null) {
    const color = BOXES[selected - 1].color;
    const winningColor = result ? prizeColor(result.prize.type) : null;
    return <div className={`${styles.opening} ${styles[stage]}`} role="dialog" aria-modal="true" aria-labelledby="opening-title">
      <div className={styles.openingInner}>
        <p className={styles.eyebrow}>Algo bueno está por pasar</p>
        <h2 id="opening-title">Tu sorpresa está despertando.</h2>
        <p>Cuatro luces. Un regalo para ti.</p>
        <div className={styles.stage} aria-hidden="true">
          <div className={styles.orbit}>{BOXES.map((box) => <i key={box.color} className={`${styles.orb} ${box.color === winningColor ? styles.winner : ""}`} />)}</div>
          <div className={styles.beam} />
          <GiftArt color={color} open={stage === "openingLid"} className={styles.gift} />
          <div className={styles.burst}>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--x": Math.cos(i / 12 * Math.PI * 2) * 135 + "px", "--y": Math.sin(i / 12 * Math.PI * 2) * 125 - 25 + "px", "--r": i * 47 + "deg", "--delay": i % 3 * 25 + "ms" } as CSSProperties} />)}</div>
        </div>
        <p role="status" className={styles.message}>{error ? "Tu elección está protegida." : stage === "openingLid" ? "Tu regalo está aquí" : stage === "settling" ? "Confirmando tu sorpresa…" : "Descubriendo tu regalo…"}</p>
        {error && <div className={styles.error}><p role="alert" className={shared.error}>{error}</p><Button className={shared.button} onClick={() => void choose(selected)}>COMPROBAR MI ELECCIÓN</Button></div>}
      </div>
    </div>;
  }
  return <ChocolateBackground><main className={`${styles.board} cp-page-enter`} aria-busy={checking}>
    <header className={styles.header}><p className={styles.eyebrow}>Tu momento de suerte</p><h1>SIGUE TU <span>INTUICIÓN.</span></h1><p>Toca una caja y descubre tu sorpresa.</p></header>
    <div ref={grid} className={styles.grid} aria-label="Elige una de las cuatro cajas">{BOXES.map((box, i) => <button key={box.color} type="button" className={styles.box} disabled={checking} aria-label={"Abrir caja " + (i + 1) + ", " + box.name} onClick={() => void choose(i + 1)}><span className={styles.boxArt}><GiftArt color={box.color} /></span></button>)}</div>
    <p className={styles.hint} role={checking ? "status" : undefined}>{checking ? "Preparando tu elección…" : "Solo puedes abrir una caja."}</p>
  </main></ChocolateBackground>;
}
