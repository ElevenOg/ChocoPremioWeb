"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function ChocolateLoader() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={styles.container}
      >
        {/* Glow suave */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={styles.glow}
        />

        {/* Chocolate */}
        <motion.div
          animate={{
            rotate: 360,
            y: [0, -8, 0],
          }}
          transition={{
            rotate: {
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
            },
            y: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          style={styles.chocolate}
        >
          🍫
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
    background: "radial-gradient(circle at top,#fffdf6 0%,#fff6e4 35%,#fdeccf 60%,#f6ddb1 100%)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
  },

  glow: {
    position: "absolute",
    width: "clamp(90px,18vw,140px)",
    height: "clamp(90px,18vw,140px)",
    borderRadius: "999px",
    background: "rgba(77,56,0,0.12)",
    filter: "blur(20px)",
  },

  chocolate: {
    fontSize: "clamp(55px,11vw,85px)",
    willChange: "transform",
    userSelect: "none",
  },
};