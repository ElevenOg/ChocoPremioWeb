"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChocolateLoaderProps {
  /**
   * Controla si el loader está visible.
   * El padre decide cuándo mostrarlo/ocultarlo,
   * y AnimatePresence se encarga de animar la salida
   * de forma correcta (a diferencia de envolverlo
   * internamente sin condición real de desmontaje).
   *
   * Ejemplo de uso en el padre:
   *   <ChocolateLoader isVisible={isLoading} />
   */
  isVisible?: boolean;
}

function ChocolateLoader({ isVisible = true }: ChocolateLoaderProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="chocolate-loader"
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
              opacity: [0.2, 0.35, 0.2]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut"
            }}
            style={styles.glow}
          />

          {/* Chocolate: imagen real en vez de emoji, así se ve
              idéntico en todos los dispositivos (el emoji 🍫
              cambia de diseño según el sistema/navegador). */}
          <motion.img
            src="/images/choco.png"
            alt="Cargando"
            draggable={false}
            animate={{
              rotate: 360,
              y: [0, -8, 0]
            }}
            transition={{
              rotate: {
                duration: 1.2,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear"
              },
              y: {
                duration: 2,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut"
              }
            }}
            style={styles.chocolate}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ChocolateLoader);

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
    background:
      "radial-gradient(circle at top,#fffdf6 0%,#fff6e4 35%,#fdeccf 60%,#f6ddb1 100%)"
    // backdropFilter eliminado: el fondo ya es opaco y cubre
    // toda la pantalla, así que no hay contenido detrás que
    // necesite desenfocarse. Esto elimina el cálculo de blur
    // más costoso de todo el componente (se recalculaba en
    // cada frame sobre el 100% del viewport).
  },

  glow: {
    position: "absolute",
    width: "clamp(90px,18vw,140px)",
    height: "clamp(90px,18vw,140px)",
    borderRadius: "999px",
    background: "rgba(77,56,0,0.12)",
    filter: "blur(20px)",
    willChange: "transform, opacity"
  },

  chocolate: {
    // Mínimo (celular) 46px, preferido escala con el ancho
    // de pantalla (8vw), máximo (PC/escritorio) 68px.
    // Antes era clamp(55px,11vw,85px): se veía grande en PC
    // y algo grande en celular. Si querés afinarlo más:
    //  - subí el primer número para que en celular se vea más grande
    //  - subí el último número para que en PC se vea más grande
    width: "clamp(46px, 8vw, 68px)",
    height: "auto",
    willChange: "transform",
    userSelect: "none",
    pointerEvents: "none"
  }
};