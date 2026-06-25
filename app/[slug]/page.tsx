"use client";

// Hooks de React
import { useState, useRef, useEffect, useCallback } from "react";

// Librería de animaciones
import { motion, AnimatePresence } from "framer-motion";

// Navegación y parámetros dinámicos de Next.js
import { useRouter, useParams } from "next/navigation";

// Cliente de Supabase
import { supabase } from "@/lib/supabase";

// COMPONENTE DE CARGA
import ChocolateLoader from "../components/ChocolateLoader";

// COMPONENTE DE FONDO
import ChocolateBackground from "../components/ChocolateBackground";

// BLOQUEO DE NAVEGACIÓN
import useBlockBackNavigation from "../components/useBlockBackNavigation";

// AUDIO MANAGER
import { playSound, preloadSounds } from "../components/AudioManager";

interface Commerce {
  id: string;
  slug: string;
  social_url: string | null;
}

export default function Intro() {
  /**
   * BLOQUEA regresar desde Intro
   * (se queda en Intro)
   */
  useBlockBackNavigation();

  // Estado para controlar si aceptó términos
  const [accepted, setAccepted] = useState<boolean>(false);

  // Estado para saber si siguió la cuenta
  const [followed, setFollowed] = useState<boolean>(false);

  // Estado para abrir/cerrar modal
  const [showModal, setShowModal] = useState<boolean>(false);

  // Estado de carga inicial
  const [loading, setLoading] = useState<boolean>(true);

  // Datos del comercio cargados desde Supabase
  const [commerce, setCommerce] = useState<Commerce | null>(null);

  /**
   * Guarda la sesión creada en game_sessions
   * para luego actualizar estadísticas
   */
  const [sessionId, setSessionId] = useState<string | null>(null);

  /**
   * Evita doble click en jugar
   */
  const [startingGame, setStartingGame] = useState<boolean>(false);

  /**
   * Controla si ya se hizo la precarga de sonidos.
   * Se dispara en el primer gesto real del usuario
   * (click), no en el montaje, para que AudioContext
   * no quede suspendido en Safari/iOS.
   */
  const soundsPreloaded = useRef(false);

  // Router de Next.js
  const router = useRouter();

  // Parámetros dinámicos de la URL
  const params = useParams<{ slug: string }>();

  // Prefetch de la página del juego
  useEffect(() => {
    const slug = params?.slug;

    if (!slug) return;

    router.prefetch(`/${slug}/game`);
  }, [router, params?.slug]);

  // Referencia para el scroll interno del modal
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /**
   * Recuperación de sesión guardada.
   * (la precarga de sonidos se movió al primer
   * gesto del usuario, ver ensureSoundsReady)
   */
  useEffect(() => {
    /**
     * Recupera si el usuario ya siguió la cuenta
     */
    const followedSession = sessionStorage.getItem("followed");

    if (followedSession === "true") {
      setFollowed(true);
    }

    /**
     * Recupera si aceptó términos
     */
    const acceptedSession = sessionStorage.getItem("accepted");

    if (acceptedSession === "true") {
      setAccepted(true);
    }
  }, []);

  /**
   * Carga dinámica del comercio
   * según el slug de la URL
   */
  useEffect(() => {
    const loadCommerce = async () => {
      // Activa loader
      setLoading(true);

      /**
       * Busca comercio por slug
       */
      const { data, error } = await supabase
        .from("commerces")
        .select("*")
        .eq("slug", params.slug)
        .maybeSingle();

      // Manejo de errores
      if (error || !data) {
        console.error(error);

        setCommerce(null);

        setLoading(false);

        return;
      }

      // Guarda datos del comercio
      setCommerce(data);

      /**
       * Busca campaña activa del comercio
       */
      const { data: activeCampaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("commerce_id", data.id)
        .eq("active", true)
        .single();

      /**
       * SESSION PERSISTENTE:
       * Mantiene la misma sesión aunque recargue
       * SOLO cambia si cierra pestaña/navegador
       */
      const existingSessionId = sessionStorage.getItem("intro_session_id");

      /**
       * Si ya existe sesión en esta pestaña
       * reutiliza la misma
       */
      if (existingSessionId) {
        setSessionId(existingSessionId);

        setLoading(false);

        return;
      }

      /**
       * Crea sesión automáticamente
       * apenas entra a Intro
       *
       * Esto cuenta:
       * "Cuántos escanearon"
       */
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .insert([
          {
            commerce_id: data.id,
            campaign_id: activeCampaign?.id || null,
            scanned_qr: true
          }
        ])
        .select()
        .single();

      if (sessionError) {
        console.error(sessionError);
      }

      /**
       * Guarda session ID
       * para luego actualizar:
       * seguir instagram
       * jugar
       * ganar
       * perder
       */
      if (sessionData) {
        setSessionId(sessionData.id);

        /**
         * Se guarda SOLO por pestaña
         * si recarga se mantiene
         * si cierra pestaña desaparece
         */
        sessionStorage.setItem("intro_session_id", sessionData.id);
      }

      // Finaliza loader
      setLoading(false);
    };

    loadCommerce();
  }, [params.slug]);

  /**
   * Animación automática del scroll
   * dentro del modal de términos.
   *
   * Se limpian los timeouts si el modal se cierra
   * antes de que termine la secuencia, para evitar
   * llamadas innecesarias sobre un ref obsoleto.
   */
  useEffect(() => {
    if (!showModal || !scrollRef.current) return;

    const el = scrollRef.current;

    const cleanupTimeouts: ReturnType<typeof setTimeout>[] = [];

    const downTimeout = setTimeout(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth"
      });

      const upTimeout = setTimeout(() => {
        el.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }, 700);

      // Guardamos referencia para poder limpiarlo también
      cleanupTimeouts.push(upTimeout);
    }, 200);

    cleanupTimeouts.push(downTimeout);

    return () => {
      cleanupTimeouts.forEach(clearTimeout);
    };
  }, [showModal]);

  /**
   * Asegura que el AudioContext se cree/reanude
   * dentro de un gesto real del usuario (requisito
   * de Safari/iOS). Se ejecuta solo una vez.
   */
  const ensureSoundsReady = useCallback(() => {
    if (soundsPreloaded.current) return;

    soundsPreloaded.current = true;

    preloadSounds();
  }, []);

  /**
   * Reproduce sonido click.
   * También garantiza que el audio esté listo
   * (primer gesto del usuario).
   */
  const playClick = useCallback(() => {
    ensureSoundsReady();

    playSound("click");
  }, [ensureSoundsReady]);

  /**
   * Maneja el botón de seguir Instagram.
   *
   * FIX clave: la redirección ocurre de forma SÍNCRONA
   * dentro del evento de click, sin esperar ningún await
   * antes. Si se espera una promesa (como el update a Supabase)
   * antes de redirigir, el navegador deja de considerar la
   * navegación como originada por un gesto directo del usuario,
   * y por eso en móvil aparecía el aviso de "¿deseas salir?".
   *
   * El guardado en Supabase ahora corre en paralelo,
   * sin bloquear la redirección.
   *
   * Además se agrega un fallback: si Instagram no está
   * instalado, tras 800ms sin cambiar de app, abre la URL
   * normal en el navegador.
   */
  const handleFollow = useCallback(() => {
    if (followed) return;

    playClick();

    if (!commerce?.social_url) return;

    const socialUrl = commerce.social_url;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      /**
       * Usamos el LINK UNIVERSAL de Instagram
       * (https://instagram.com/usuario), NO el esquema
       * personalizado (instagram://).
       *
       * Por qué: los links universales (Universal Links en iOS,
       * App Links en Android) los resuelve el propio sistema
       * operativo de forma nativa, UNA sola vez:
       * - Si Instagram está instalado, el SO intercepta la
       *   navegación https y abre la app directamente.
       * - Si no está instalado, el navegador simplemente
       *   sigue normal a la página web de Instagram.
       *
       * Esto evita por completo el problema de "doble redirección"
       * que ocurre con esquemas personalizados (instagram://)
       * combinados con timeouts de fallback, porque ya no hay
       * que adivinar si la app abrió o no — lo decide el sistema
       * antes de que JavaScript tenga que hacer nada extra.
       */
      window.location.href = socialUrl;
    } else {
      window.open(socialUrl, "_blank");
    }

    setFollowed(true);

    sessionStorage.setItem("followed", "true");

    // Guardado de estadística EN PARALELO, no bloqueante
    if (sessionId) {
      supabase
        .from("game_sessions")
        .update({ clicked_social: true })
        .eq("id", sessionId)
        .then(({ error }) => {
          if (error) console.error(error);
        });
    }
  }, [followed, playClick, commerce, sessionId]);

  /**
   * Maneja inicio del juego
   */
  const handleStartGame = useCallback(async () => {
    /**
     * Evita doble click
     * y múltiples inserts/updates
     */
    if (startingGame) return;

    setStartingGame(true);

    playClick();

    try {
      /**
       * Marca que el usuario jugó
       */
      if (sessionId) {
        await supabase
          .from("game_sessions")
          .update({ played: true })
          .eq("id", sessionId);
      }

      /**
       * Envía session_id al juego
       * para luego guardar:
       * ganó
       * perdió
       * premio
       */
      router.push(`/${params.slug}/game?session=${sessionId}`);
    } catch (error) {
      console.error(error);

      setStartingGame(false);
    }
  }, [startingGame, playClick, sessionId, router, params.slug]);

  /**
   * Maneja apertura del modal de términos
   */
  const handleOpenTermsModal = useCallback(() => {
    playClick();

    setShowModal(true);
  }, [playClick]);

  /**
   * Maneja aceptación de términos
   */
  const handleAcceptTerms = useCallback(() => {
    playClick();

    setAccepted(true);

    sessionStorage.setItem("accepted", "true");

    setShowModal(false);
  }, [playClick]);

  /**
   * Pantalla de carga inicial
   */
  if (loading) {
    return <ChocolateLoader />;
  }

  /**
   * Comercio no encontrado
   */
  if (!commerce) {
    return (
      <ChocolateBackground>
        <h1
          style={{
            color: "#4d3800",
            fontSize: "clamp(18px, 4vw, 24px)",
            fontWeight: "900",
            textAlign: "center",
            zIndex: 2,
            letterSpacing: "1px"
          }}
        >
          NO DISPONIBLE
        </h1>
      </ChocolateBackground>
    );
  }

  return (
    <ChocolateBackground>
      {/* Tarjeta principal */}
      <motion.div
        initial={{
          scale: 0.8,
          opacity: 0,
          y: 50
        }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0
        }}
        transition={{
          duration: 0.6
        }}
        style={styles.card}
      >
        {/* Emoji animado */}
        <motion.div
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop"
          }}
          style={styles.emoji}
        >
          🍫
        </motion.div>

        {/* Título principal */}
        <motion.h1
          style={styles.title}
          animate={{
            opacity: [1, 0.92, 1]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatType: "loop"
          }}
        >
          <>
            ¡JUEGA Y GANA TU <br />
            PREMIO!
          </>
        </motion.h1>

        {/* Texto descriptivo */}
        <p style={styles.text}>
          Rompe el chocolate y prueba tu suerte
        </p>

        {/* Caja de términos */}
        <div style={styles.termsBox}>
          <label style={styles.termsLabel}>
            <input
              type="checkbox"
              checked={accepted}
              onClick={(e) => {
                e.preventDefault();

                handleOpenTermsModal();
              }}
              readOnly
              style={styles.checkbox}
            />

            <span>Acepto términos y condiciones</span>
          </label>
        </div>

        {/* Botón de Instagram */}
        <motion.button
          onClick={handleFollow}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          style={{
            ...styles.instaButton,
            background: followed ? "#fffb012c" : "#4d3800",
            color: followed ? "#000000" : "#ffffff",
            border: followed ? "1px solid #fffb01" : "1px solid #4d3800"
          }}
        >
          {followed ? "✔ Cuenta seguida" : "Seguir en Instagram"}
        </motion.button>

        {/* Botón para iniciar juego */}
        <motion.button
          disabled={!(accepted && followed) || startingGame}
          onClick={handleStartGame}
          whileTap={{ scale: 0.95 }}
          whileHover={{
            scale: accepted && followed && !startingGame ? 1.05 : 1
          }}
          style={{
            ...styles.button,
            opacity: accepted && followed && !startingGame ? 1 : 0.5
          }}
        >
          {startingGame ? "CARGANDO..." : "JUGAR AHORA"}
        </motion.button>

        {/* Mensaje de validación */}
        <p
          style={{
            ...styles.warning,
            visibility: accepted && followed ? "hidden" : "visible"
          }}
        >
          Debes aceptar y seguir en Instagram
        </p>
      </motion.div>

      {/* Modal de términos */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="terms-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={styles.modalOverlay}
          >
            <motion.div
              initial={{
                scale: 0.7,
                opacity: 0,
                y: 40
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              exit={{
                scale: 0.7,
                opacity: 0,
                y: 40
              }}
              transition={{
                duration: 0.35,
                type: "spring",
                damping: 18
              }}
              style={styles.modal}
            >
              <div ref={scrollRef} style={styles.modalContent}>
                <h3 style={styles.modalTitle}>Condiciones</h3>

                <ul style={styles.modalList}>
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

                <h3 style={styles.modalTitle}>Términos</h3>

                <ul style={styles.modalList}>
                  <li>• Participar implica aceptar términos</li>
                  <li>• Es una actividad promocional</li>
                  <li>• La organización podrá verificar participaciones duplicadas</li>
                  <li>• Cualquier intento de manipulación anula la participación</li>
                  <li>• En caso de fallas técnicas, la dinámica podrá ser ajustada</li>
                </ul>

                <p style={styles.modalNote}>
                  🎥 Puede ser grabado con fines promocionales
                </p>
              </div>

              <button style={styles.modalButton} onClick={handleAcceptTerms}>
                Acepto
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personalización scrollbar */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #e6d3a3;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: #4d3800;
          border-radius: 10px;
        }
      `}</style>
    </ChocolateBackground>
  );
}

/**
 * Objeto global de estilos
 */
const styles: { [key: string]: React.CSSProperties } = {
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "rgba(255,255,255,0.95)",
    borderRadius: "30px",
    padding: "22px 16px",
    textAlign: "center",
    boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
    zIndex: 5,
    position: "relative"
  },

  emoji: {
    fontSize: "clamp(60px, 12vw, 80px)",
    willChange: "transform"
  },

  title: {
    fontSize: "clamp(20px, 5vw, 25px)",
    fontWeight: "900",
    color: "#4d3800",
    marginBottom: "15px",
    willChange: "opacity"
  },

  text: {
    fontSize: "clamp(15px, 4vw, 18px)",
    color: "#000000",
    marginBottom: "25px"
  },

  termsBox: {
    background: "#fffb012c",
    padding: "10px",
    borderRadius: "15px",
    marginBottom: "15px",
    border: "1px solid #fffb01"
  },

  instaButton: {
    width: "100%",
    padding: "10px",
    borderRadius: "15px",
    fontSize: "15px",
    cursor: "pointer",
    marginBottom: "25px"
  },

  termsLabel: {
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "#000000"
  },

  checkbox: {
    width: "18px",
    height: "18px",
    accentColor: "#4d3800",
    cursor: "pointer"
  },

  button: {
    width: "100%",
    padding: "16px",
    borderRadius: "50px",
    border: "none",
    background: "#4d3800",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer"
  },

  warning: {
    fontSize: "15px",
    color: "#565656",
    marginTop: "10px",
    height: "16px"
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(5px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10
  },

  modal: {
    width: "90%",
    maxWidth: "350px",
    height: "500px",
    background: "#fffaf3",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },

  modalContent: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
    scrollbarColor: "#4d3800 #e6d3a3",
    scrollbarWidth: "thin"
  },

  modalTitle: {
    fontSize: "18px",
    textAlign: "center",
    fontWeight: "900",
    marginBottom: "10px",
    color: "#4d3800"
  },

  modalList: {
    textAlign: "left",
    fontSize: "15px",
    marginBottom: "10px",
    color: "#000000"
  },

  modalNote: {
    fontSize: "15px",
    textAlign: "center",
    marginTop: "25px",
    marginBottom: "25px",
    color: "#000000"
  },

  modalButton: {
    width: "100%",
    padding: "15px",
    border: "none",
    background: "#4d3800",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer"
  }
};