"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Play, Volume2, VolumeX } from "lucide-react";
import useBlockZoom from "./useBlockZoom";
import styles from "../Home.module.css";

type IOSVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

export function HomeEnhancements() {
  useBlockZoom();

  useEffect(() => {
    const root = document.querySelector("[data-home-root]");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || media.matches || !("IntersectionObserver" in window)) return;

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-home-reveal]")
    );
    const animations = new Set<Animation>();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.removeAttribute("data-home-pending");
        observer.unobserve(element);

        if (typeof element.animate !== "function") return;
        const animation = element.animate(
          [
            { opacity: 0, transform: "translateY(24px)" },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: 600,
            delay: Number(element.dataset.homeDelay || 0),
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          }
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { rootMargin: "0px 0px -60px 0px", threshold: 0.05 });

    const pending = elements.filter(
      (element) => element.getBoundingClientRect().top >= window.innerHeight
    );
    pending.forEach((element) => {
      element.dataset.homePending = "true";
      observer.observe(element);
    });

    const clear = () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      elements.forEach((element) => element.removeAttribute("data-home-pending"));
    };
    const onPreference = () => { if (media.matches) clear(); };
    media.addEventListener("change", onPreference);

    return () => {
      media.removeEventListener("change", onPreference);
      clear();
    };
  }, []);

  return null;
}

export function VideoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current as IOSVideo | null;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
          if (
            !entry.isIntersecting &&
            document.fullscreenElement !== container &&
            !video.webkitDisplayingFullscreen
          ) video.pause();
        }, { threshold: 0.15 })
      : null;
    observer?.observe(video);

    let wasFullscreen = false;
    let frameId: number | undefined;

    const onFullscreen = () => {
      if (document.fullscreenElement === container) {
        wasFullscreen = true;
      } else if (wasFullscreen) {
        wasFullscreen = false;
        const reset = () => {
          window.scrollTo(0, window.scrollY);
          document.documentElement.scrollLeft = 0;
          document.body.scrollLeft = 0;
        };
        reset();
        frameId = requestAnimationFrame(reset);
      }
    };
    const onIOSExit = () => setPlaying(!video.paused);
    const onVisibility = () => { if (document.hidden) video.pause(); };

    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);
    video.addEventListener("webkitendfullscreen", onIOSExit);

    return () => {
      observer?.disconnect();
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("webkitendfullscreen", onIOSExit);
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      video.pause();
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); return; }

    setError(null);
    try {
      if (video.error) video.load();
      await video.play();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError("No se pudo reproducir el video. Toca de nuevo para reintentar.");
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current as IOSVideo | null;
    if (!container || !video) return;
    setError(null);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (video.webkitDisplayingFullscreen) {
        video.webkitExitFullscreen?.();
      } else if (
        video.webkitEnterFullscreen &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
      ) {
        video.webkitEnterFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else {
        setError("La pantalla completa no está disponible en este navegador.");
      }
    } catch {
      setError("No se pudo abrir la pantalla completa. El video puede verse aquí.");
    }
  };

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-linear-to-br from-[#ffe9b8] via-[#fdeccf] to-transparent opacity-70 blur-2xl"
        aria-hidden="true"
      />
      <div className={styles.phoneFrame + " relative rounded-[2.5rem] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_30px_80px_rgba(77,56,0,0.35)]"}>
        <div aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 z-20 h-24 w-5 -translate-y-1/2 rounded-r-xl bg-[#1a1a1a]" />
        <div ref={containerRef} className={styles.videoViewport + " group relative h-full overflow-hidden rounded-4xl bg-black"}>
          <video
            ref={videoRef}
            className="h-full w-full bg-black object-contain"
            src="/video/video.MP4"
            poster="/images/cap.webp"
            playsInline
            preload="metadata"
            onPlay={() => { setPlaying(true); setStarted(true); setError(null); }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
            onError={() => { setPlaying(false); setError("No se pudo cargar el video. Toca reproducir para reintentar."); }}
          />
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausar video" : started ? "Reanudar video" : "Reproducir video"}
            className="absolute inset-0 z-0 flex items-center justify-center bg-transparent"
          >
            {!playing && (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform hover:scale-105">
                <Play className="ml-1 h-7 w-7 text-[#4d3800]" fill="currentColor" aria-hidden="true" />
              </span>
            )}
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-linear-to-t from-black/60 to-transparent px-3 pb-3 pt-8">
            <button
              type="button"
              onClick={() => { const video = videoRef.current; if (video) video.muted = !video.muted; }}
              aria-label={muted ? "Activar sonido" : "Silenciar"}
              aria-pressed={muted}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4d3800] shadow-lg transition duration-200 hover:scale-105 hover:bg-[#fff6e4] active:scale-95"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Pantalla completa"
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4d3800] shadow-lg transition duration-200 hover:scale-105 hover:bg-[#fff6e4] active:scale-95"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {error && <p role="status" className="mt-3 text-center text-sm text-[#8a3b22]">{error}</p>}
    </div>
  );
}
