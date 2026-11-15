"use client";

import { useEffect } from "react";
import useBlockZoom from "./useBlockZoom";

export default function useBlockBackNavigation() {
  useBlockZoom();

  useEffect(() => {
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    const href = window.location.href;
    const pushGuard = () => {
      // Conserva el estado de navegación de Next.js.
      window.history.pushState({ ...window.history.state, chocoGuard: href }, "", href);
    };
    if (window.history.state?.chocoGuard !== href) pushGuard();

    const onBack = () => {
      if (window.location.href === href) pushGuard();
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1 && event.touches[0].clientX < 20) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F5" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r")) event.preventDefault();
    };

    window.addEventListener("popstate", onBack);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => {
      document.body.style.overscrollBehavior = previousOverscroll;
      window.removeEventListener("popstate", onBack);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, []);
}
