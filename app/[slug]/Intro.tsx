"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, ShieldCheck } from "lucide-react";
import ChocolateBackground from "../components/ChocolateBackground";
import Image from "next/image";
import { Button } from "../components/ui/Button";
import useBlockBackNavigation from "../components/useBlockBackNavigation";
import { playSound, preloadSounds } from "../components/AudioManager";
import useErrorSound from "../components/useErrorSound";
import { startGameSession } from "@/lib/client/gameApi";
import { errorMessage, postJson, requestJson } from "@/lib/client/api";
import { gameStorage, readStorage, writeStorage } from "@/lib/client/storage";
import { navigateWithRecovery } from "@/lib/client/navigation";
import { runWhenIdle } from "@/lib/client/idle";
import { safeSocialUrl } from "@/lib/game/social";
import type { IntroSession } from "@/lib/game/types";
import styles from "./Experience.module.css";

const TermsModal = dynamic(() => import("./TermsModal"), { ssr: false });

export default function Intro({ slug }: { slug: string }) {
  useBlockBackNavigation();
  const router = useRouter();
  const [session, setSession] = useState<IntroSession | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const submitRef = useRef(false);
  const sessionRequest = useRef<Promise<IntroSession> | null>(null);
  const socialRecorded = useRef<string | null>(null);
  const cancelNavigation = useRef<(() => void) | null>(null);
  const social = session ? Boolean(session.social_url) : true;
  useErrorSound(error);

  useEffect(() => () => cancelNavigation.current?.(), []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setAccepted((value) => value || readStorage(gameStorage.accepted(slug)) === "true");
      setFollowed((value) => value || readStorage(gameStorage.social(slug)) === "true");
    });
    const request = startGameSession(slug, readStorage(gameStorage.session(slug))).then((data) => {
      if (typeof data?.session_id !== "string" || !data.session_id) throw new Error("No se pudo preparar el juego. Intenta de nuevo.");
      const prepared = { ...data, social_url: safeSocialUrl(data.social_url) };
      if (!active) return prepared;
      setSession(prepared);
      writeStorage(gameStorage.session(slug), data.session_id);
      setError("");
      return prepared;
    });
    sessionRequest.current = request;
    void request.catch((cause) => { if (active) setError(errorMessage(cause)); });
    return () => { active = false; };
  }, [slug, attempt]);

  useEffect(() => {
    if (!session) return;
    return runWhenIdle(() => {
      router.prefetch("/" + slug + (session.has_result ? "/result" : "/game") + "?session=" + encodeURIComponent(session.session_id));
    });
  }, [session, slug, router]);

  useEffect(() => {
    if (!session || !followed || !social || socialRecorded.current === session.session_id) return;
    socialRecorded.current = session.session_id;
    // A visit before session creation is recorded once the session is ready.
    void requestJson("/api/session/social", { method: "POST", body: JSON.stringify({ sessionId: session.session_id }), keepalive: true })
      .catch(() => { socialRecorded.current = null; });
  }, [session, followed, social]);

  const follow = () => {
    if (!social) return;
    preloadSounds(); playSound("click");
    setFollowed(true);
    writeStorage(gameStorage.social(slug), "true");
  };
  const start = async () => {
    if (submitRef.current || (!session?.has_result && (!accepted || (social && !followed)))) return;
    submitRef.current = true; setBusy(true); setError("");
    preloadSounds(); playSound("click");
    try {
      const prepared = session ?? await sessionRequest.current;
      if (!prepared) throw new Error("No se pudo preparar el juego. Intenta de nuevo.");
      if (!prepared.has_result && prepared.social_url && !followed) { submitRef.current = false; setBusy(false); return; }
      if (!prepared.has_result) await postJson("/api/session/play", { sessionId: prepared.session_id });
      const href = "/" + slug + (prepared.has_result ? "/result" : "/game") + "?session=" + encodeURIComponent(prepared.session_id);
      cancelNavigation.current = navigateWithRecovery(href, (url) => router.push(url));
    } catch (cause) { submitRef.current = false; setBusy(false); setError(errorMessage(cause)); }
  };

  return <ChocolateBackground>
    <section className={`${styles.card} ${styles.introEnter}`}>
    <div className={styles.art}>
      <Image
        src="/images/logoCP.webp"
        width={468}
        height={644}
        sizes="(max-height: 620px) 100px, 75px"
        alt="ChocoPremio"
        loading="eager"
        fetchPriority="high"
        draggable={false}
        className="h-auto w-full"
      />
    </div>
    <h1 className={styles.title}>CUATRO CAJAS.<br /><span className={styles.accent}>UN REGALO PARA TI.</span></h1>
    <p className={styles.copy}>Sigue tu intuición. Elige una caja y descubre tu sorpresa.</p>
    <button type="button" className={`${styles.terms} ${accepted ? styles.termsDone : ""}`} onClick={() => { playSound("click"); setModal(true); }}>
      {accepted ? <Check size={17} /> : <ShieldCheck size={17} />} {accepted ? "Términos aceptados" : "Acepta los términos"}
    </button>
    {social && <a href={session?.social_url ?? "/" + encodeURIComponent(slug) + "/social"} target="_blank" rel="noopener noreferrer" aria-describedby="social-return-hint" onClick={follow} className={`${styles.social} ${followed ? styles.socialDone : ""}`}>
      {followed ? <Check size={17} /> : <ExternalLink size={17} />} {followed ? "Volver a nuestra red social" : "Visita nuestra red social"}
    </a>}
    {social && <p id="social-return-hint" className={styles.socialHint}>La red social se abre en otra pestaña. Tu juego sigue aquí.</p>}
    <Button className={styles.button} onClick={start} loading={busy} loadingLabel="Preparando tu juego" disabled={busy || Boolean(error && !session) || (!session?.has_result && (!accepted || Boolean(social && !followed)))}>
      {session?.has_result ? "VER MI PREMIO" : "ELEGIR MI CAJA"}<ArrowRight size={17} />
    </Button>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {error && !session && <button type="button" className={styles.retry} onClick={() => { playSound("click"); setError(""); setAttempt((value) => value + 1); }}>VOLVER A INTENTAR</button>}
    <p className={styles.note}>{session?.has_result ? "Tu elección ya está guardada." : "Completa los pasos y vuelve aquí para elegir una sola caja."}</p>
    {modal && <TermsModal onClose={() => { playSound("click"); setModal(false); }} onAccept={() => { setAccepted(true); writeStorage(gameStorage.accepted(slug), "true"); setModal(false); playSound("confirm"); }} />}
  </section></ChocolateBackground>;
}
