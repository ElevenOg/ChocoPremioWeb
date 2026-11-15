"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import useDialog from "../components/useDialog";
import styles from "./TermsModal.module.css";

interface TermsModalProps {
  onAccept: () => void;
  onClose: () => void;
}

export default function TermsModal({ onAccept, onClose }: TermsModalProps) {
  const dialogRef = useDialog(true, onClose);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, []);

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Términos y condiciones" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div ref={scrollRef} className={styles.modalContent}>
          <h3 className={styles.modalTitle}>Condiciones</h3>
          <ul className={styles.modalList}>
            <li>• Juega solo en el punto</li>
            <li>• Elige una caja por participación</li>
            <li>• La elección no se puede cambiar</li>
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
            Puede ser grabado con fines promocionales
          </p>
        </div>
        <button className={styles.modalButton} onClick={onAccept}>
          Acepto los términos
        </button>
      </div>
    </div>, document.body
  );
}
