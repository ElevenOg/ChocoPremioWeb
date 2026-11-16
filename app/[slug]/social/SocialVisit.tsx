"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ChocolateBackground from "../../components/ChocolateBackground";
import { Button } from "../../components/ui/Button";
import styles from "../Experience.module.css";

export default function SocialVisit({ socialUrl, unavailable = false, pending = false }: { socialUrl: string | null; unavailable?: boolean; pending?: boolean }) {
  const [closeHelp, setCloseHelp] = useState(false);

  useEffect(() => {
    if (!socialUrl) return;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type === "back_forward") return;
    // Paint a real return screen before handing the HTTPS link to the browser/app.
    // If the app takes over, this tab keeps useful content instead of about:blank.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => window.location.assign(socialUrl));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [socialUrl]);

  return <ChocolateBackground><main className={styles.card}>
    <h1 className={styles.title}>TU JUEGO<br /><span className={styles.accent}>SIGUE AQUÍ.</span></h1>
    <p className={styles.copy} role={pending ? "status" : undefined}>{pending
      ? "Estamos abriendo la red social. Tu juego sigue abierto en la pestaña anterior."
      : unavailable
      ? "No pudimos abrir la red social. Puedes intentarlo de nuevo o volver a tu juego."
      : socialUrl ? "Visita nuestra red social y vuelve a la pestaña de ChocoPremio para elegir tu caja."
        : "Puedes continuar en ChocoPremio. Este comercio no requiere visitar una red social."}</p>
    {socialUrl && <a className={styles.social} href={socialUrl} rel="noreferrer"><ExternalLink size={17} /> ABRIR RED SOCIAL</a>}
    {unavailable && <Button className={styles.social} onClick={() => window.location.reload()}>VOLVER A INTENTAR</Button>}
    <Button className={styles.button} onClick={() => { window.close(); setCloseHelp(true); }}><ArrowLeft size={17} /> VOLVER A MI JUEGO</Button>
    <p className={styles.note} role={closeHelp ? "status" : undefined}>{closeHelp
      ? "Cierra esta pestaña y selecciona la pestaña de ChocoPremio. Tu juego sigue abierto allí."
      : "Si se abrió la app, regresa al navegador. Tu partida permanece en la pestaña anterior."}</p>
  </main></ChocolateBackground>;
}
