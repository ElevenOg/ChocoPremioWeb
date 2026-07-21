import { useEffect } from "react";
import { preloadSounds } from "../../components/AudioManager";
import { consumeNavStart } from "../../components/loaderConfig";

let assetsWarmed = false;

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

function idlePreloadSounds(): Promise<void> {
  return new Promise((resolve) => {
    const run = () => {
      Promise.resolve(preloadSounds()).then(() => resolve()).catch(() => resolve());
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run, { timeout: 1000 });
    } else {
      setTimeout(run, 0);
    }
  });
}

function safeFontsReady(): Promise<void> {
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      return document.fonts.ready.then(() => undefined).catch(() => undefined);
    }
  } catch {
    // noop
  }
  return Promise.resolve();
}

let warmupPromise: Promise<void> | null = null;

export function preloadGameAssets(): Promise<void> {
  if (assetsWarmed) return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  warmupPromise = Promise.all([
    preloadImage("/images/choco.webp"),
    preloadImage("/images/gift.webp"),
    preloadImage("/images/parti.webp"),
    idlePreloadSounds(),
    safeFontsReady()
  ]).then(() => {
    assetsWarmed = true;
    warmupPromise = null;
  });

  return warmupPromise;
}

export function useGameLoader() {
  useEffect(() => {
    consumeNavStart();
    if (!assetsWarmed) preloadGameAssets();
  }, []);

  return { loading: false };
}