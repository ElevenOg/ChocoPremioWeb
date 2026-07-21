"use client";

import { memo, useCallback, useState } from "react";

import ChocolateBackground from "../../components/ChocolateBackground";
import ChocolateLoader from "../../components/ChocolateLoader";
import useBlockBackNavigation from "../../components/useBlockBackNavigation";
import { useClaim, GIFTS } from "./useClaim";
import styles from "./Claim.module.css";

interface StepChipProps {
  label: string;
  done: boolean;
  onClick?: () => void;
}

const StepChip = memo(function StepChip({ label, done, onClick }: StepChipProps) {
  return (
    <div
      onClick={!done ? onClick : undefined}
      className={`${styles.stepChip} ${done ? styles.stepChipDone : ""}`}
    >
      <div className={`${styles.stepIcon} ${done ? styles.stepIconDone : ""}`}>
        {done ? "✓" : "✕"}
      </div>
      <span className={`${styles.stepLabel} ${done ? styles.stepLabelDone : ""}`}>{label}</span>
      {!done && onClick && <span className={styles.stepArrow}>→</span>}
    </div>
  );
});

const FloatingGifts = memo(function FloatingGifts() {
  return (
    <div className={styles.floatingGifts} aria-hidden="true">
      {GIFTS.map((i) => (
        <span
          key={i}
          className={styles.giftParticle}
          style={{
            left: `${8 + i * 16}%`,
            fontSize: i % 2 === 0 ? "20px" : "14px",
            opacity: 0.15 + i * 0.02,
            animationDuration: `${5 + i * 0.9}s`,
            animationDelay: `${i * 0.8}s`
          }}
        >
          🎁
        </span>
      ))}
    </div>
  );
});

const MODAL_EXIT_MS = 180;

export default function Claim() {
  useBlockBackNavigation();

  const {
    loading,
    redeemed,
    showConfirm,
    submitting,
    prizeName,
    canFinish,
    handleRedeem,
    handleFinish,
    handleCancel,
    handleConfirmFinish
  } = useClaim();

  const [closing, setClosing] = useState(false);

  const closeModal = useCallback(
    (after: () => void) => {
      setClosing(true);
      window.setTimeout(() => {
        setClosing(false);
        after();
      }, MODAL_EXIT_MS);
    },
    []
  );

  const onCancel = useCallback(() => {
    closeModal(handleCancel);
  }, [closeModal, handleCancel]);

  const onOverlayClick = useCallback(() => {
    if (submitting) return;
    closeModal(handleCancel);
  }, [closeModal, handleCancel, submitting]);

  if (loading) {
    return <ChocolateLoader isVisible={true} />;
  }

  return (
    <>
      <ChocolateBackground>
        <FloatingGifts />

        <div className={styles.card}>
          <div className={styles.logoWrapper}>
            <div className={styles.halo} />
            <div className={styles.logoEmoji}>🎁</div>
          </div>

          <h1 className={`${styles.title} ${styles.fadeItem} ${styles.delay1}`}>¡FELICIDADES!</h1>

          <p className={`${styles.subtitle} ${styles.fadeItem} ${styles.delay2}`}>Has ganado:</p>

          <div className={`${styles.prizeBox} ${styles.fadeItem} ${styles.delay3}`}>{prizeName}</div>

          <div className={`${styles.divider} ${styles.fadeItem} ${styles.delay3}`} />

          <div className={`${styles.steps} ${styles.fadeItem} ${styles.delay4}`}>
            <StepChip
              label={redeemed ? "Mostrado en caja" : "Mostrar en caja"}
              done={redeemed}
              onClick={handleRedeem}
            />
          </div>

          <div className={`${styles.buttonWrap} ${styles.fadeItem} ${styles.delay5}`}>
            <button
              disabled={!canFinish}
              onClick={handleFinish}
              className={`${styles.button} ${!canFinish ? styles.buttonDisabled : ""}`}
            >
              {canFinish && <span className={styles.buttonShine} />}
              <span className={styles.buttonLabel}>FINALIZAR</span>
            </button>
          </div>

          <div className={`${styles.termsBox} ${styles.fadeItem} ${styles.delay6}`}>
            <p className={styles.termsTitle}>Importante:</p>
            <ul className={styles.termsList}>
              <li>• Validar el premio en el punto de atención</li>
            </ul>
          </div>
        </div>
      </ChocolateBackground>

      {(showConfirm || closing) && (
        <div
          className={`${styles.modalOverlay} ${closing ? styles.modalOverlayExit : ""}`}
          onClick={onOverlayClick}
        >
          <div
            className={`${styles.modal} ${closing ? styles.modalExit : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>¿Finalizar sesión?</h2>
            <p className={styles.modalText}>Se limpiará el premio y volverás al inicio.</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={onCancel}>
                CANCELAR
              </button>
              <button
                className={styles.confirmButton}
                disabled={submitting}
                onClick={handleConfirmFinish}
                style={{ opacity: submitting ? 0.7 : 1 }}
              >
                FINALIZAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}