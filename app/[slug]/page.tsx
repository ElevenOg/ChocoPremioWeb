"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react";
import ChocolateBackground from "../components/ChocolateBackground";
import IntroRetry from "./IntroRetry";
import Image from "next/image";
import { Button } from "../components/ui/Button";
import useBlockBackNavigation from "../components/useBlockBackNavigation";
import { playSound, preloadSounds } from "../components/AudioManager";
import useErrorSound from "../components/useErrorSound";
import { startGameSession } from "@/lib/client/gameApi";
import { errorMessage, postJson, requestJson } from "@/lib/client/api";
import { gameStorage, readStorage, writeStorage } from "@/lib/client/storage";
import { navigateWithRecovery } from "@/lib/client/navigation";
import type { IntroSession } from "@/lib/game/types";
import styles from "./Experience.module.css";

const TermsModal = dynamic(() => import("./TermsModal"), { ssr: false });

export default function Intro() {
  useBlockBackNavigation();
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [session, setSession] = useState<IntroSession | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const submitRef = useRef(false);
  const cancelNavigation = useRef<(() => void) | null>(null);
  const ready = session !== null;
  useErrorSound(error);

  useEffect(() => () => cancelNavigation.current?.(), []);

  useEffect(() => {
    let active = true;
    // Load the box screen code while the visitor completes the intro steps.
    void import("./game/Game").catch(() => undefined);
    startGameSession(slug, readStorage(gameStorage.session(slug))).then((data) => {
      if (!active) return;
      if (typeof data?.session_id !== "string" || !data.session_id) throw new Error("No se pudo preparar el juego. Intenta de nuevo.");
      let social: string | null = null;
      try { if (data.social_url && new URL(data.social_url).protocol === "https:") social = data.social_url; } catch { /* No se abren enlaces inválidos. */ }
      setSession({ ...data, social_url: social });
      router.prefetch("/" + slug + (data.has_result ? "/result" : "/game") + "?session=" + encodeURIComponent(data.session_id));
      writeStorage(gameStorage.session(slug), data.session_id);
      setAccepted(readStorage(gameStorage.accepted(slug)) === "true");
      setFollowed(!social || readStorage(gameStorage.social(slug)) === "true");
      setError("");
    }).catch((cause) => { if (active) setError(errorMessage(cause)); });
    router.prefetch("/" + slug + "/game");
    return () => { active = false; };
  }, [slug, router, attempt]);

  const follow = () => {
    if (!session?.social_url) return;
    preloadSounds(); playSound("click");
    setFollowed(true);
    writeStorage(gameStorage.social(slug), "true");
    void requestJson("/api/session/social", { method: "POST", body: JSON.stringify({ sessionId: session.session_id }), keepalive: true }).catch(() => undefined);
    window.open(session.social_url, "_blank", "noopener,noreferrer");
  };
  const start = async () => {
    if (!session || submitRef.current || (!session.has_result && (!accepted || !followed))) return;
    submitRef.current = true; setBusy(true); setError("");
    preloadSounds(); playSound("click");
    try {
      if (!session.has_result) await postJson("/api/session/play", { sessionId: session.session_id });
      const href = "/" + slug + (session.has_result ? "/result" : "/game") + "?session=" + encodeURIComponent(session.session_id);
      cancelNavigation.current = navigateWithRecovery(href, (url) => router.push(url));
    } catch (cause) { submitRef.current = false; setBusy(false); setError(errorMessage(cause)); }
  };
  if (error && !session) return <ChocolateBackground><IntroRetry onRetry={() => { setError(""); setAttempt((value) => value + 1); }} /></ChocolateBackground>;

  return <ChocolateBackground>
    {!ready && <div className={styles.introLoading} role="status" aria-label="Preparando el juego"><span aria-hidden="true" /></div>}
    <section className={`${styles.card} ${ready ? styles.introOpening : styles.introPending}`} aria-busy={!ready || busy} inert={!ready}>
    <div className={styles.art}>
      <Image
        src="/images/logoCP.webp"
        width={468}
        height={644}
        alt="ChocoPremio"
        loading="eager"
        fetchPriority="high"
        unoptimized
        draggable={false}
        className="h-auto w-full"
      />
    </div>
    <h1 className={styles.title}>CUATRO CAJAS.<br /><span className={styles.accent}>UN REGALO PARA TI.</span></h1>
    <p className={styles.copy}>Sigue tu intuición. Elige una caja y descubre tu sorpresa.</p>
    <button type="button" className={`${styles.terms} ${accepted ? styles.termsDone : ""}`} onClick={() => { playSound("click"); setModal(true); }}>
      {accepted ? <Check size={17} /> : <ShieldCheck size={17} />} {accepted ? "Términos aceptados" : "Acepta los términos"}
    </button>
    {session?.social_url && <button type="button" onClick={follow} className={`${styles.social} ${followed ? styles.socialDone : ""}`}>
      {followed ? <Check size={17} /> : <ExternalLink size={17} />} {followed ? "Volver a nuestra red social" : "Visita nuestra red social"}
    </button>}
    <Button className={styles.button} onClick={start} loading={busy} loadingLabel="Preparando tu juego" disabled={!session || busy || (!session.has_result && (!accepted || !followed))}>
      {session?.has_result ? "VER MI PREMIO" : "ELEGIR MI CAJA"}<ArrowRight size={17} />
    </Button>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <p className={styles.note}>{session?.has_result ? "Tu elección ya está guardada." : "Completa los pasos y vuelve aquí para elegir una sola caja."}</p>
    {modal && <TermsModal onClose={() => { playSound("click"); setModal(false); }} onAccept={() => { setAccepted(true); writeStorage(gameStorage.accepted(slug), "true"); setModal(false); playSound("confirm"); }} />}
  </section></ChocolateBackground>;
}
