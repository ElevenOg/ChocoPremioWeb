"use client";

import { useEffect } from "react";

/**
 * BLOQUEA:
 * - Botón atrás navegador
 * - Gestos back iPhone/Android
 * - Swipe Safari iPhone
 * - Zoom con dos dedos (pinch)
 * - Zoom con doble toque
 * - Gestos nativos Safari (gesturestart/change/end)
 *
 * BLOQUEA TAMBIÉN:
 * - F5 / CTRL+R (recarga por teclado)
 *
 * PERMITE:
 * - Cerrar pestaña/app
 * - Abrir otras apps (Instagram, etc)
 * - Volver desde otras apps
 *
 * Flujo:
 * Intro → Game → Result → Claim
 *
 * CARACTERÍSTICAS:
 * - NO muestra avisos
 * - Comportamiento tipo "kiosco" / app nativa
 */
export default function useBlockBackNavigation() {

  useEffect(() => {

    // Bloquea gestos del navegador solo mientras este hook está activo
    document.documentElement.style.touchAction = "none";
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";

    /**
     * Estado inicial
     */
    window.history.replaceState(
      null,
      "",
      window.location.href
    );

    /**
     * Inserta historial falso
     * para bloquear back
     */
    for (let i = 0; i < 20; i++) {

      window.history.pushState(
        null,
        "",
        window.location.href
      );
    }

    /**
     * Bloquea botón atrás
     */
    const handlePopState = () => {

      window.history.pushState(
        null,
        "",
        window.location.href
      );
    };

    /**
     * Bloquea swipe back iPhone
     * y pinch zoom (2+ dedos)
     */
    function handleTouchStart(
      e: TouchEvent
    ) {

      // Pinch zoom: 2 o más dedos
      if (e.touches.length > 1) {

        e.preventDefault();
        return;
      }

      // Swipe back desde el borde
      if (e.touches[0].clientX < 20) {

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
     * Bloquea doble toque
     * (double-tap zoom)
     */
    let lastTouchEnd = 0;

    function handleTouchEnd(
      e: TouchEvent
    ) {

      const now = Date.now();

      // Doble toque rápido (< 300ms)
      if (now - lastTouchEnd < 300) {

        e.preventDefault();
      }

      lastTouchEnd = now;
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

    /**
     * Bloquea recarga por teclado
     * F5 y Ctrl+R / Cmd+R
     */
    function handleKeyDown(
      e: KeyboardEvent
    ) {

      if (e.key === "F5") {

        e.preventDefault();
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "r"
      ) {

        e.preventDefault();
      }
    }

    /**
     * Listener botón atrás
     */
    window.addEventListener(
      "popstate",
      handlePopState
    );

    /**
     * Touch: swipe back + pinch
     */
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

    /**
     * Touch: doble toque zoom
     */
    document.addEventListener(
      "touchend",
      handleTouchEnd,
      { passive: false }
    );

    /**
     * Safari: gestos nativos
     */
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
     * Teclado: F5 / Ctrl+R
     */
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    /**
     * Limpieza
     */
    return () => {

      // Restaura el comportamiento normal al salir del juego
      document.documentElement.style.touchAction = "";
      document.body.style.touchAction = "";
      document.body.style.overscrollBehavior = "";

      window.removeEventListener(
        "popstate",
        handlePopState
      );

      document.removeEventListener(
        "touchstart",
        handleTouchStart
      );

      document.removeEventListener(
        "touchmove",
        handleTouchMove
      );

      document.removeEventListener(
        "touchend",
        handleTouchEnd
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

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

  }, []);
}