import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGameResult } from "../useGameResult";
import { clearGameStorage, gameStorage, readStorage, writeStorage } from "@/lib/client/storage";
import { forgetGameResult } from "@/lib/client/gameApi";
import { playSound } from "../../components/AudioManager";
import useErrorSound from "../../components/useErrorSound";

export function useClaim() {
  const { slug } = useParams<{ slug: string }>();
  const sessionId = useSearchParams().get("session");
  const router = useRouter();
  const loaded = useGameResult(slug, sessionId);
  useErrorSound(loaded.error || (loaded.result && !loaded.result.won ? "Sin premio" : ""));
  const [shown, setShown] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const finishingRef = useRef(false);
  const [finishing, setFinishing] = useState(false);
  useEffect(() => { router.prefetch("/"); }, [router]);
  useEffect(() => {
    let active = true;
    if (sessionId && loaded.result) Promise.resolve().then(() => {
      if (active && readStorage(gameStorage.shown(sessionId)) === "true") setShown(sessionId);
    });
    return () => { active = false; };
  }, [sessionId, loaded.result]);
  return {
    ...loaded, error: loaded.error || (loaded.result && !loaded.result.won ? "Esta participación no tiene un premio para mostrar." : ""),
    retry: () => { playSound("click"); loaded.retry(); },
    shown: Boolean(sessionId && shown === sessionId), confirm, setConfirm, finishing, introHref: "/" + slug,
    markShown: () => {
      if (!sessionId || !loaded.result?.won) return;
      // Es un indicador local de presentación; el canje lo valida el comercio.
      writeStorage(gameStorage.shown(sessionId), "true"); setShown(sessionId); playSound("confirm");
    },
    finish: () => {
      if (!sessionId || finishingRef.current) return;
      finishingRef.current = true; setFinishing(true);
      clearGameStorage(slug, sessionId); forgetGameResult(slug, sessionId); playSound("confirm");
      router.replace("/");
    },
  };
}
