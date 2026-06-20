"use client";

import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  useRouter,
  useParams,
  useSearchParams
} from "next/navigation";

/**
 * COMPONENTE DE FONDO
 */
import ChocolateBackground from "../../components/ChocolateBackground";

/**
 * COMPONENTE DE CARGA
 */
import ChocolateLoader from "../../components/ChocolateLoader";

// BLOQUEO DE NAVEGACIÓN
import useBlockBackNavigation from "../../components/useBlockBackNavigation";

/**
 * AUDIO MANAGER
 */
import {
  playSound,
  preloadSounds
} from "../../components/AudioManager";

interface PrizeData {
  prize?: {
    name?: string;
  };
}

export default function Claim() {

  /**
   * BLOQUEA regresar desde Intro
   * (se queda en Intro)
   */
  useBlockBackNavigation();

  const router = useRouter();

  const params = useParams();

  const searchParams = useSearchParams();

  const slug =
    params.slug as string;

  const sessionId =
    searchParams.get("session");

  const [loading, setLoading] =
    useState(true);

  const [redeemed, setRedeemed] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [prize, setPrize] =
    useState<{
      name: string;
    }>({
      name: "Cargando..."
    });

  /**
   * Precargar sonidos
   */
  useEffect(() => {

    preloadSounds();

  }, []);

  /**
   * Cargar premio guardado
   */
  useEffect(() => {

    try {

      if (!sessionId) {

        setLoading(false);

        return;
      }

      /**
       * Premio guardado desde RESULT
       */
      const savedPrize =
        localStorage.getItem(
          `prize_${sessionId}`
        );

      if (savedPrize) {

        const parsed: PrizeData =
          JSON.parse(savedPrize);

        setPrize({

          name:
            parsed.prize?.name ||
            "Premio especial"
        });
      }

      /**
       * Estado mostrado en caja
       */
      const redeemedSession =
        sessionStorage.getItem(
          `redeemed_${sessionId}`
        );

      if (
        redeemedSession === "true"
      ) {

        setRedeemed(true);
      }

    } catch (error) {

      console.error(
        "CLAIM LOAD ERROR",
        error
      );
    } finally {

      setLoading(false);
    }

  }, [sessionId]);

  /**
   * Mostrar en caja
   */
  const handleRedeem =
    async () => {

      await playSound(
        "click"
      );

      setRedeemed(true);

      if (sessionId) {

        sessionStorage.setItem(
          `redeemed_${sessionId}`,
          "true"
        );
      }
    };

  /**
   * Abrir modal finalizar
   */
  const handleFinish =
    async () => {

      await playSound(
        "click"
      );

      setShowConfirm(true);
    };

  /**
   * Cancelar modal
   */
  const handleCancel =
    async () => {

      await playSound(
        "click"
      );

      setShowConfirm(false);
    };

  /**
   * Finalizar y limpiar
   */
  const handleConfirmFinish =
    async () => {

      await playSound(
        "click"
      );

      /**
       * LIMPIAR SESSION STORAGE
       */
      if (sessionId) {

        sessionStorage.removeItem(
          `retry_${sessionId}`
        );

        sessionStorage.removeItem(
          `effects_played_${sessionId}`
        );

        sessionStorage.removeItem(
          `redeemed_${sessionId}`
        );

        localStorage.removeItem(
          `prize_${sessionId}`
        );
      }

      /**
       * Legacy
       */
      sessionStorage.removeItem(
        "redeemed"
      );

      localStorage.removeItem(
        "prize"
      );

      /**
       * Volver a inicio
       */
      router.push("/");
    };

  /**
   * Loader
   */
  if (loading) {

    return (
      <ChocolateLoader />
    );
  }

  return (

    <ChocolateBackground>

      <motion.div
        initial={{
          scale: 0.85,
          opacity: 0
        }}
        animate={{
          scale: 1,
          opacity: 1
        }}
        transition={{
          duration: 0.45
        }}
        style={styles.card}
      >

        <div style={styles.iconBox}>
          🎁
        </div>

        <h1 style={styles.title}>
          ¡CASI ES TUYO!
        </h1>

        <p style={styles.subtitle}>
          Has ganado:
        </p>

        <div style={styles.prizeBox}>
          {prize.name}
        </div>

        <div style={styles.stepBox}>

          <p style={styles.stepTitle}>
            Muestra este premio en caja
          </p>

          <p style={styles.stepText}>
            Un supervisor validará tu premio.
          </p>

        </div>

        <motion.button
          whileTap={{
            scale: 0.97
          }}
          whileHover={{
            scale: 1.02
          }}
          onClick={
            handleRedeem
          }
          style={{
            ...styles.claimButton,

            background: redeemed
              ? "#fffb012c"
              : "#4d3800",

           color: redeemed
              ? "#000000"
              : "#ffffff",

           border: redeemed
              ? "1px solid #fffb01"
              : "1px solid #4d3800"
          }}
        >

          {redeemed
            ? "✔ Mostrado en caja"
            : "Mostrar en caja"}

        </motion.button>

        <motion.button
          disabled={!redeemed}
          whileTap={{
            scale: 0.97
          }}
          whileHover={{
            scale: redeemed
              ? 1.02
              : 1
          }}
          onClick={
            handleFinish
          }
          style={{
            ...styles.finalButton,
            opacity:
              redeemed
                ? 1
                : 0.5
          }}
        >
          FINALIZAR
        </motion.button>

        <div style={styles.termsBox}>

          <p style={styles.termsTitle}>
            Importante:
          </p>

          <ul style={styles.termsList}>
            <li>
              • El premio debe validarse en el punto de atención
            </li>
          </ul>

        </div>

      </motion.div>

      <AnimatePresence>

        {showConfirm && (

          <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            style={styles.modalOverlay}
          >

            <motion.div
              initial={{
                scale: 0.8,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.8,
                opacity: 0
              }}
              transition={{
                duration: 0.25
              }}
              style={styles.modal}
            >

              <div style={styles.modalIcon}>
                🍫
              </div>

              <h2 style={styles.modalTitle}>
                ¿Finalizar sesión?
              </h2>

              <p style={styles.modalText}>
                Se limpiará el premio y volverás al inicio.
              </p>

              <div style={styles.modalButtons}>

                <button
                  onClick={
                    handleCancel
                  }
                  style={
                    styles.cancelButton
                  }
                >
                  CANCELAR
                </button>

                <button
                  onClick={
                    handleConfirmFinish
                  }
                  style={
                    styles.confirmButton
                  }
                >
                  FINALIZAR
                </button>

              </div>

            </motion.div>

          </motion.div>
        )}

      </AnimatePresence>

    </ChocolateBackground>
  );
}

const styles: {
  [key: string]:
    React.CSSProperties;
} = {

  card: {
    width: "100%",
    maxWidth: "400px",
    background:
      "rgba(255,255,255,0.96)",
    borderRadius: "30px",
    padding: "30px",
    textAlign: "center",
    boxShadow:
      "0 25px 70px rgba(0,0,0,0.25)",
    zIndex: 2,
    position: "relative"
  },

  iconBox: {
    fontSize: "42px",
  },

  title: {
    fontSize: "clamp(20px, 5vw, 25px)",
    fontWeight: "900",
    color: "#4d3800",
    marginBottom: "8px"
  },

  subtitle: {
    fontSize: "12px",
    color: "#000",
    marginBottom: "10px"
  },

  prizeBox: {
    fontSize: "15px",
    fontWeight: "bold",
    marginBottom: "16px",
    padding: "12px",
    borderRadius: "15px",
    background: "#fff4c7",
    border:
      "2px dashed #d9b100",
    color: "#000",
    lineHeight: 1.4
  },

  stepBox: {
    background: "#f7f3ed",
    borderRadius: "14px",
    padding: "12px",
    marginBottom: "14px"
  },

  stepTitle: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#000",
    marginBottom: "4px"
  },

  stepText: {
    fontSize: "12px",
    color: "#555",
    margin: 0,
    lineHeight: 1.4
  },

  claimButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "15px",
    border: "1px solid #4d3800",
    background: "#4d3800",
    color: "#ffffff",
    fontSize: "15px",
    cursor: "pointer",
    marginBottom: "14px",
    transition: "all 0.25s ease"
  },

  finalButton: {
    width: "100%",
    padding: "16px",
    borderRadius: "50px",
    border: "none",
    background: "#4d3800",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "12px"
  },

  termsBox: {
    marginTop: "5px",
    background: "#f5f1eb",
    padding: "12px",
    borderRadius: "12px",
    textAlign: "left"
  },

  termsTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "5px",
    color: "#4d3800"
  },

  termsList: {
    paddingLeft: "12px",
    margin: 0,
    fontSize: "13px",
    color: "#000",
    lineHeight: "1.5"
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 999
  },

  modal: {
    width: "100%",
    maxWidth: "350px",
    background:"#fffaf3",
    borderRadius: "20px",
    padding: "24px",
    textAlign: "center",
    boxShadow:"0 20px 60px rgba(0,0,0,0.25)"
  },

  modalIcon: {
    fontSize: "34px",
    marginBottom: "8px"
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "900",
    marginBottom: "8px",
    color: "#4d3800"
  },

  modalText: {
    fontSize: "14px",
    color: "#5e5e5e",
    marginBottom: "18px",
    lineHeight: 1.4
  },

  modalButtons: {
    display: "flex",
    gap: "10px"
  },

  cancelButton: {
    flex: 1,
    padding: "12px",
    borderRadius: "50px",
    border: "none",
    background: "#d9c7a7",
    color: "#4d3800",
    fontWeight: "bold",
    fontSize: "13px",
    cursor: "pointer"
  },

  confirmButton: {
    flex: 1,
    padding: "12px",
    borderRadius: "50px",
    border: "none",
    background: "#4d3800",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "13px",
    cursor: "pointer"
  }
};