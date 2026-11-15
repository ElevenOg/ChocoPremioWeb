"use client";

import { useCallback } from "react";
import { CheckCircle2, Store } from "lucide-react";
import ChocolateBackground from "../../components/ChocolateBackground";
import AsyncMessage from "../../components/AsyncMessage";
import GiftArt, { BOXES, prizeColor } from "../../components/ui/GiftArt";
import { Button } from "../../components/ui/Button";
import FeedbackDialog from "../../components/FeedbackDialog";
import { playSound } from "../../components/AudioManager";
import useBlockBackNavigation from "../../components/useBlockBackNavigation";
import { useClaim } from "./useClaim";
import styles from "../Experience.module.css";

export default function Claim() {
  useBlockBackNavigation();
  const { result, loading, error, retry, shown, markShown, confirm, setConfirm, finishing, finish, introHref } = useClaim();
  const cancel = useCallback(() => { if (!finishing) { playSound("click"); setConfirm(false); } }, [setConfirm, finishing]);
  if (error) return <ChocolateBackground><AsyncMessage message={error} onRetry={retry} href={introHref} /></ChocolateBackground>;
  if (loading || !result) return <ChocolateBackground><FeedbackDialog title="Recuperando tu premio" description="Estamos preparando los datos de tu participación." loading standalone /></ChocolateBackground>;
  return <ChocolateBackground><section className={`${styles.card} ${styles.ticket} ${!loading ? "cp-page-enter" : ""}`} aria-busy={loading}>
    <>
      <div className={styles.art}><GiftArt color={BOXES[(result.selected_box ?? 0) - 1]?.color ?? prizeColor(result.prize.type)} chocolate={result.prize.type === "big_discount"} discount={["small_discount", "medium_discount", "large_discount"].includes(result.prize.type)} /></div>
      <h1 className={styles.title}>{result.prize.name || result.prize.title}</h1>
      <p className={styles.copy}>Muestra esta pantalla al personal del comercio para validar tu beneficio.</p>
      {result.prize.redemption_condition && <div className={styles.condition}><small>Condiciones de tu regalo</small><p>{result.prize.redemption_condition}</p></div>}
      {shown ? <p className={`${styles.terms} ${styles.termsDone} ${styles.presented}`} role="status"><CheckCircle2 size={18} /><span>Marcado como mostrado en caja</span></p> : <Button className={styles.showPrize} onClick={markShown}><Store size={18} /> MOSTRAR EN CAJA</Button>}
      <Button className={`${styles.button} ${styles.finish}`} disabled={!shown} onClick={() => { playSound("click"); setConfirm(true); }}>FINALIZAR</Button>
      <p className={styles.note}>La entrega del premio debe confirmarla el personal del comercio.</p>
    </>
    {confirm && <FeedbackDialog title="¿Finalizar participación?" description="Si el personal ya validó tu premio, puedes volver al inicio. Esta acción limpia el premio de este navegador." onClose={cancel} actions={[
      { label: "VOLVER", onClick: cancel, secondary: true, disabled: finishing },
      { label: "FINALIZAR", onClick: finish, loading: finishing },
    ]} />}
  </section></ChocolateBackground>;
}
