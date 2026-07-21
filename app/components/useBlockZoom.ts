"use client";

import { useEffect } from "react";

/**
 * BLOQUEA:
 * - Zoom con dos dedos (pinch) en iPhone y Android
 * - Gestos nativos Safari (gesturestart/change/end)
 *
 * NO BLOQUEA:
 * - Tap normal (para reproducir video, tocar botones, etc.)
 * - Doble toque (ya no se bloquea, para no interferir con taps)
 * - Botón atrás
 * - Recarga (F5 / Ctrl+R)
 * - Scroll normal
 *
 * Úsalo en páginas donde solo quieres evitar el pinch zoom
 * (Intro, Login, Dashboard), sin tocar la navegación ni el tap.
 */
export default function useBlockZoom() {

  useEffect(() => {

    /**
     * Bloquea pinch zoom (2+ dedos)
     */
    function handleTouchStart(
      e: TouchEvent
    ) {

      if (e.touches.length > 1) {

        e.preventDefault();
      }
    }

    /**
     * Bloquea pinch zoom
     * mientras se mueven los dedos
     */
    function handleTouchMove(
      e: TouchEvent
    ) {

      if (e.touches.length > 1) {

        e.preventDefault();
      }
    }

    /**
     * Bloquea gestos nativos
     * Safari (pinch/rotate)
     */
    function preventGesture(
      e: Event
    ) {

      e.preventDefault();
    }

    document.addEventListener(
      "touchstart",
      handleTouchStart,
      { passive: false }
    );

    document.addEventListener(
      "touchmove",
      handleTouchMove,
      { passive: false }
    );

    document.addEventListener(
      "gesturestart",
      preventGesture as EventListener
    );

    document.addEventListener(
      "gesturechange",
      preventGesture as EventListener
    );

    document.addEventListener(
      "gestureend",
      preventGesture as EventListener
    );

    /**
     * Limpieza
     */
    return () => {

      document.removeEventListener(
        "touchstart",
        handleTouchStart
      );

      document.removeEventListener(
        "touchmove",
        handleTouchMove
      );

      document.removeEventListener(
        "gesturestart",
        preventGesture as EventListener
      );

      document.removeEventListener(
        "gesturechange",
        preventGesture as EventListener
      );

      document.removeEventListener(
        "gestureend",
        preventGesture as EventListener
      );
    };

  }, []);
}