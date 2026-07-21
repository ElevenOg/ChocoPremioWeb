"use client";

import { useEffect, useRef } from "react";
import styles from "./Intro.module.css";

interface TermsModalProps {
  onAccept: () => void;
  onClose: () => void;
}

/* ---------------------------------------------------------
   Componente separado a propósito: así puede importarse con
   next/dynamic({ ssr: false }) desde Intro y el JS del modal
   (que la mayoría de usuarios jamás llega a necesitar si ya
   aceptó antes) no viaja en el bundle inicial.

   OPTIMIZACIÓN ANDROID:
   Antes había un scrollTo suave hacia abajo y luego otro de
   vuelta arriba (encadenando 2 rAF). Esa animación de scroll
   "de cortesía" es exactamente el tipo de cosa que en Android
   se nota entrecortada porque compite con la animación de
   entrada del modal (que corre al mismo tiempo). Se quita: el
   modal abre limpio, sin ese scroll-bounce extra, y se siente
   más inmediato sin perder nada funcional (el usuario igual
   puede scrollear el contenido normalmente).
--------------------------------------------------------- */
export default function TermsModal({ onAccept, onClose }: TermsModalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Nos aseguramos de que el modal siempre abra desde arriba,
    // sin animación de scroll (instantáneo, cero costo de composición).
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, []);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div ref={scrollRef} className={styles.modalContent}>
          <h3 className={styles.modalTitle}>Condiciones</h3>
          <ul className={styles.modalList}>
            <li>• Juega solo en el punto</li>
            <li>• 1 intento por persona</li>
            <li>• +1 intento por compra</li>
            <li>• Máx. 2 intentos por persona</li>
            <li>• Resultado aleatorio</li>
            <li>• Premios con condiciones</li>
            <li>• No canjeable por dinero</li>
            <li>• No acumulable</li>
            <li>• Premios sujetos a disponibilidad</li>
            <li>• El premio debe validarse en el punto de atención</li>
            <li>• Redención válida únicamente el día de la participación</li>
          </ul>
          <h3 className={styles.modalTitle}>Términos</h3>
          <ul className={styles.modalList}>
            <li>• Participar implica aceptar términos</li>
            <li>• Es una actividad promocional</li>
            <li>• La organización podrá verificar participaciones duplicadas</li>
            <li>• Cualquier intento de manipulación anula la participación</li>
            <li>• En caso de fallas técnicas, la dinámica podrá ser ajustada</li>
          </ul>
          <p className={styles.modalNote}>
            🎥 Puede ser grabado con fines promocionales
          </p>
        </div>
        <button className={styles.modalButton} onClick={onAccept}>
          Acepto los términos
        </button>
      </div>
    </div>
  );
}