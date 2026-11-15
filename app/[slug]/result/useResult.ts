import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGameResult } from "../useGameResult";
import { playSound } from "../../components/AudioManager";
import useErrorSound from "../../components/useErrorSound";
import { errorMessage, postJson } from "@/lib/client/api";
import { clearGameStorage, gameStorage, readStorage, writeStorage } from "@/lib/client/storage";
import { forgetGameResult } from "@/lib/client/gameApi";

export function useResult() {
  const { slug } = useParams<{ slug: string }>();
  const sessionId = useSearchParams().get("session");
  const router = useRouter();
  const loaded = useGameResult(slug, sessionId);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  useErrorSound(loaded.error || actionError);
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!sessionId || !loaded.result) return;
    if (readStorage(gameStorage.effects(sessionId)) !== "true") {
      if (playSound(loaded.result.won ? "win" : "lose")) writeStorage(gameStorage.effects(sessionId), "true");
    }
    router.prefetch("/" + slug + "/claim?session=" + encodeURIComponent(sessionId));
  }, [loaded.result, sessionId, router, slug]);
  const claim = async () => {
    if (!sessionId || submittingRef.current || !loaded.result?.won) return;
    submittingRef.current = true; setSubmitting(true); setActionError(""); playSound("click");
    try {
      await postJson("/api/session/claim", { sessionId });
      router.push("/" + slug + "/claim?session=" + encodeURIComponent(sessionId));
    } catch (cause) { submittingRef.current = false; setSubmitting(false); setActionError(errorMessage(cause)); }
  };
  return { ...loaded, retry: () => { playSound("click"); loaded.retry(); }, actionError, submitting, claim, introHref: "/" + slug,
    finish: () => { if (submittingRef.current) return; playSound("click"); submittingRef.current = true; setSubmitting(true); if (sessionId) { clearGameStorage(slug, sessionId); forgetGameResult(slug, sessionId); } router.push("/"); },
  };
}
