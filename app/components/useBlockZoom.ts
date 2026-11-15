"use client";

import { useEffect } from "react";

export default function useBlockZoom() {

  useEffect(() => {

    function handleTouchStart(
      e: TouchEvent
    ) {

      if (e.touches.length > 1) {

        e.preventDefault();
      }
    }

    function handleTouchMove(
      e: TouchEvent
    ) {

      if (e.touches.length > 1) {

        e.preventDefault();
      }
    }

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