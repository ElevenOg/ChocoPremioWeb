"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useBlockZoom from "./useBlockZoom";
import { initializeGameAudio } from "./AudioManager";

export default function useBlockBackNavigation() {
  useBlockZoom();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(initializeGameAudio, []);

  useEffect(() => {
    const previousOverscrollX = document.body.style.overscrollBehaviorX;
    document.body.style.overscrollBehaviorX = "none";
    const href = window.location.href;
    const pageState = { ...window.history.state, chocoGuard: href };
    const pushGuard = () => {
      // Conserva el estado de navegación de Next.js.
      window.history.pushState(pageState, "", href);
    };
    if (window.history.state?.chocoGuard !== href) pushGuard();

    const onBack = (event: PopStateEvent) => {
      // Handle same-document Back before Next.js restores a previous screen.
      event.stopImmediatePropagation();
      pushGuard();
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1 && event.touches[0].clientX < 20) event.preventDefault();
    };
    window.addEventListener("popstate", onBack, true);
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => {
      document.body.style.overscrollBehaviorX = previousOverscrollX;
      window.removeEventListener("popstate", onBack, true);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, [pathname, search]);
}
