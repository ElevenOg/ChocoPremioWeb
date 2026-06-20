"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ChocolateBackgroundProps {
  children: ReactNode;

  /**
   * NUEVO:
   * Permite ocultar emojis flotantes
   * SOLO para pantallas como loader
   */
  hideFloatingEmojis?: boolean;
}

function ChocolateTop() {

  return (

    <svg
      style={styles.chocolateTop}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
    >
      <path
        d="M0 0 H100 V26
          C95 32, 92 26, 88 26
          C85 26, 83 30, 80 30
          C77 30, 75 26, 72 26
          C69 26, 67 36, 64 36
          C61 36, 59 24, 56 24
          C53 24, 51 30, 48 30
          C45 30, 43 26, 40 26
          C37 26, 35 36, 32 36
          C29 36, 27 26, 24 26
          C21 26, 19 32, 16 32
          C13 32, 11 24, 8 24
          C5 24, 2 32, 0 32 Z"
        fill="#3f2d00"
      />
    </svg>
  );
}

export default function ChocolateBackground({
  children,
  hideFloatingEmojis = false
}: ChocolateBackgroundProps) {

  return (

    <div style={styles.container}>

      {/* Glow superior */}
      <div style={styles.topGlow} />

      {/* Glow inferior */}
      <div style={styles.bottomGlow} />

      {/* Chocolate derretido */}
      <ChocolateTop />

      {/* SOLO se muestran si NO está oculto */}
      {!hideFloatingEmojis && (
        <>
          {/* Elemento flotante izquierdo */}
          <motion.div
            style={styles.floating1}
            animate={{
              y: [0, -8, -14, -8, 0],
              rotate: [0, 3, -3, 2, 0],
              scale: [1, 1.03, 1.05, 1.03, 1]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🎁
          </motion.div>

          {/* Elemento flotante derecho */}
          <motion.div
            style={styles.floating2}
            animate={{
              y: [0, 8, 14, 8, 0],
              rotate: [0, -3, 3, -2, 0],
              scale: [1, 1.03, 1.05, 1.03, 1]
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🎉
          </motion.div>
        </>
      )}

      {/* Burbuja glow 1 */}
      <motion.div
        style={styles.bubble1}
        animate={{
          y: [0, -30, 0],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 6,
          repeat: Infinity
        }}
      />

      {/* Burbuja glow 2 */}
      <motion.div
        style={styles.bubble2}
        animate={{
          y: [0, 25, 0],
          opacity: [0.25, 0.55, 0.25]
        }}
        transition={{
          duration: 7,
          repeat: Infinity
        }}
      />

      {/* Contenido */}
      <div style={styles.content}>
        {children}
      </div>

    </div>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {

  container: {
    minHeight: "100dvh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    background: `
      radial-gradient(circle at top, #fffdf6 0%, #fff6e4 35%, #fdeccf 60%, #f6ddb1 100%)
    `
  },

  content: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5
  },

  chocolateTop: {
    position: "absolute",
    top: -20,
    left: 0,
    width: "100%",
    height: "clamp(130px, 22vh, 240px)",
    zIndex: 2,
    filter: "drop-shadow(0 12px 25px rgba(0,0,0,0.25))"
  },

  topGlow: {
    position: "absolute",
    top: "-200px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "800px",
    height: "400px",
    background: "rgba(255,255,255,0.35)",
    filter: "blur(100px)",
    borderRadius: "50%",
    zIndex: 0
  },

  bottomGlow: {
    position: "absolute",
    bottom: "-250px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "700px",
    height: "350px",
    background: "rgba(255,215,120,0.28)",
    filter: "blur(120px)",
    borderRadius: "50%",
    zIndex: 0
  },

  floating1: {
    position: "absolute",
    top: "10%",
    left: "8%",
    fontSize: "clamp(34px, 5vw, 55px)",
    zIndex: 4,
    pointerEvents: "none",
    filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.2))",
    willChange: "transform"
  },

  floating2: {
    position: "absolute",
    bottom: "10%",
    right: "8%",
    fontSize: "clamp(34px, 5vw, 55px)",
    zIndex: 4,
    pointerEvents: "none",
    filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.2))",
    willChange: "transform"
  },

  bubble1: {
    position: "absolute",
    top: "22%",
    right: "12%",
    width: "160px",
    height: "160px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    filter: "blur(40px)",
    zIndex: 1
  },

  bubble2: {
    position: "absolute",
    bottom: "18%",
    left: "10%",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "rgba(255,210,120,0.22)",
    filter: "blur(45px)",
    zIndex: 1
  }
};