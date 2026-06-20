"use client";

import { useEffect } from "react";

/**
 * BLOQUEA:
 * - Botón atrás navegador
 * - Gestos back iPhone/Android
 * - Swipe Safari iPhone
 * - Recarga accidental
 * - Navegación accidental
 *
 * Flujo:
 * Intro → Game → Result → Claim
 *
 * CARACTERÍSTICAS:
 * - NO muestra avisos
 * - SÍ permite cerrar pestaña/app
 * - SÍ permite abrir Instagram
 * - SÍ permite volver desde Instagram
 * - Bloquea atrás
 * - Bloquea F5 / CTRL+R
 */
export default function useBlockBackNavigation() {

  useEffect(() => {

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
     */
    function preventEdgeSwipe(
      e: TouchEvent
    ) {

      if (e.touches[0].clientX < 20) {

        e.preventDefault();
      }
    }

    /**
     * Bloquea recarga teclado
     * SIN mostrar avisos
     */
    const handleKeyDown = (
      e: KeyboardEvent
    ) => {

      /**
       * F5
       */
      if (e.key === "F5") {

        e.preventDefault();
      }

      /**
       * CTRL + R
       */
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "r"
      ) {

        e.preventDefault();
      }
    };

    /**
     * Listener botón atrás
     */
    window.addEventListener(
      "popstate",
      handlePopState
    );

    /**
     * Safari iPhone swipe back
     */
    document.addEventListener(
      "touchstart",
      preventEdgeSwipe,
      { passive: false }
    );

    /**
     * Bloquea F5 / CTRL+R
     */
    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    /**
     * Limpieza
     */
    return () => {

      window.removeEventListener(
        "popstate",
        handlePopState
      );

      document.removeEventListener(
        "touchstart",
        preventEdgeSwipe
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

  }, []);
}