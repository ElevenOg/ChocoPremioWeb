"use client";

import { motion } from "framer-motion";

import ChocolateBackground
from "../components/ChocolateBackground";

export default function ChocolateLoader() {

  return (

    <ChocolateBackground hideFloatingEmojis>

      <div style={styles.container}>

        {/* Glow */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.35, 0.55, 0.35]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
          style={styles.glow}
        />

        {/* Chocolate */}
        <motion.div
          animate={{
            rotate: 360,
            y: [0, -8, 0]
          }}
          transition={{
            rotate: {
              duration: 1.2,
              repeat: Infinity,
              ease: "linear"
            },
            y: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          style={styles.chocolate}
        >
          🍫
        </motion.div>

      </div>

    </ChocolateBackground>
  );
}

const styles: {
  [key: string]: React.CSSProperties;
} = {

  container: {
    position: "fixed",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    zIndex: 999999
  },

  glow: {
    position: "absolute",
    width: "clamp(90px, 18vw, 140px)",
    height: "clamp(90px, 18vw, 140px)",
    borderRadius: "999px",
    background: "rgba(77, 56, 0, 0.12)",
    filter: "blur(20px)",
    zIndex: 1
  },

  chocolate: {
    fontSize: "clamp(55px, 11vw, 85px)",
    zIndex: 2,
    willChange: "transform"
  }
};