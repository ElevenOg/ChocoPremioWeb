"use client";

import FeedbackDialog from "../components/FeedbackDialog";
import { playSound } from "../components/AudioManager";

export default function IntroRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <FeedbackDialog title="¿Reintentar?" description="Falló la conexión. ¿Deseas reintentar?" standalone actions={[{ label: "REINTENTAR", onClick: () => { playSound("click"); onRetry(); } }]} />
  );
}
