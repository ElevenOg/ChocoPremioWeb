"use client";

import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";

import {
  useRouter,
  useParams,
  useSearchParams
} from "next/navigation";

import confetti from "canvas-confetti";

import { supabase } from "@/lib/supabase";

/**
 * COMPONENTE DE CARGA
 */
import ChocolateLoader from "../../components/ChocolateLoader";

/**
 * COMPONENTE DE FONDO
 */
import ChocolateBackground from "../../components/ChocolateBackground";

// BLOQUEO DE NAVEGACIÓN
import useBlockBackNavigation from "../../components/useBlockBackNavigation";

/**
 * AUDIO MANAGER
 */
import {
  playSound,
  preloadSounds
} from "../../components/AudioManager";

type PrizeType =
  | "lose"
  | "small_discount"
  | "medium_discount"
  | "large_discount"
  | "big_discount"
  | "accessory"
  | "retry";

interface Prize {
  id: string;

  campaign_id: string;

  type: PrizeType;

  title: string;

  emoji: string;

  probability: number;

  name: string;

  retry_pool: boolean;
}

interface ResultData {
  won: boolean;

  prize: Prize;
}

const prizeStyles: Record<
  PrizeType,
  {
    color: string;
    bg: string;
  }
> = {

  lose: {
    color: "#707070",
    bg: "linear-gradient(135deg, #c9c9c9, #777)"
  },

  retry: {
    color: "#00a2ff",
    bg: "linear-gradient(135deg, #00a2ff, #00a2ff)"
  },

  small_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  medium_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  large_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  big_discount: {
    color: "#00d11c",
    bg: "linear-gradient(135deg, #00d11c, #00d11c)"
  },

  accessory: {
    color: "#e6b800",
    bg: "linear-gradient(135deg, #e6b800, #e6b800)"
  }
};

export default function Result() {

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

  const [show, setShow] =
    useState(false);

  const [result, setResult] =
    useState<ResultData | null>(null);

  const initializedRef =
    useRef(false);

  /**
   * Precarga sonidos
   */
  useEffect(() => {

    preloadSounds();

  }, []);

  /**
   * Sonidos centralizados
   */
  const playWin = async () => {

    await playSound("win");
  };

  const playLose = async () => {

    await playSound("lose");
  };

  const playClick = async () => {

    await playSound("click");
  };

  /**
   * Sorteo ponderado
   */
  const pickPrize = (
    prizes: Prize[]
  ): Prize => {

    const total =
      prizes.reduce(
        (
          acc,
          prize
        ) =>
          acc +
          Number(
            prize.probability
          ),
        0
      );

    let random =
      Math.random() * total;

    for (const prize of prizes) {

      random -= Number(
        prize.probability
      );

      if (random <= 0) {

        return prize;
      }
    }

    return prizes[0];
  };

  /**
   * Sonidos y confetti
   * SOLO PRIMERA VEZ
   */
  const runEffects = async (
    prize: Prize
  ) => {

    if (!sessionId)
      return;

    const playedKey =
      `effects_played_${sessionId}`;

    const alreadyPlayed =
      sessionStorage.getItem(
        playedKey
      ) === "true";

    /**
     * Si ya reprodujo efectos
     * NO volver a reproducir
     */
    if (alreadyPlayed) {
      return;
    }

    sessionStorage.setItem(
      playedKey,
      "true"
    );

    /**
     * LOSE
     */
    if (
      prize.type === "lose"
    ) {

      await playLose();

      return;
    }

    /**
     * RETRY
     */
    if (
      prize.type === "retry"
    ) {

      return;
    }

    /**
     * WIN
     */
    await playWin();

    confetti({

      particleCount: 140,

      spread: 90,

      startVelocity: 35,

      origin: {
        y: 0.6
      }
    });
  };

  /**
   * Pool primer intento
   * TODOS los premios
   */
  const getFirstPool = (
    prizes: Prize[]
  ) => {

    return prizes.filter(
      (prize) =>
        !prize.retry_pool
    );
  };

  /**
   * Pool retry
   * SOLO:
   * lose
   * small_discount
   * medium_discount
   */
  const getRetryPool = (
    prizes: Prize[]
  ) => {

    return prizes.filter(
      (prize) =>
        prize.retry_pool &&
        [
          "lose",
          "small_discount",
          "medium_discount",
          "large_discount"
        ].includes(
          prize.type
        )
    );
  };

  useEffect(() => {

    if (
      initializedRef.current
    ) {
      return;
    }

    initializedRef.current =
      true;

    const loadResult =
      async () => {

        try {

          if (!sessionId)
            return;

          /**
           * Obtener sesión
           */
          const {
            data: session,
            error:
              sessionError
          } = await supabase
            .from(
              "game_sessions"
            )
            .select("*")
            .eq(
              "id",
              sessionId
            )
            .single();

          if (
            sessionError ||
            !session
          ) {

            console.error(
              "SESSION ERROR",
              sessionError
            );

            return;
          }

          /**
           * Obtener premios DB
           */
          const {
            data: prizes,
            error:
              prizesError
          } = await supabase
            .from("prizes")
            .select("*")
            .eq(
              "campaign_id",
              session.campaign_id
            );

          if (
            prizesError ||
            !prizes ||
            prizes.length === 0
          ) {

            console.error(
              "PRIZES ERROR",
              prizesError
            );

            return;
          }

          /**
           * Si ya existe premio guardado
           * usar el real de DB
           */
          if (
            session.prize_id
          ) {

            const existingPrize =
              (
                prizes as Prize[]
              ).find(
                (
                  prize
                ) =>
                  prize.id ===
                  session.prize_id
              );

            if (
              existingPrize
            ) {

              const existingResult: ResultData =
                {

                  won:
                    session.won,

                  prize:
                    existingPrize
                };

              setResult(
                existingResult
              );

              setLoading(
                false
              );

              setTimeout(
                async () => {

                  setShow(
                    true
                  );

                  /**
                   * SOLO reproduce
                   * si es primera vez
                   */
                  await runEffects(
                    existingPrize
                  );

                },
                300
              );

              return;
            }
          }

          /**
           * Retry mode
           */
          const retryMode =
            sessionStorage.getItem(
              `retry_${sessionId}`
            ) === "true";

          /**
           * Pool correcto
           */
          const availablePrizes =
            retryMode
              ? getRetryPool(
                  prizes as Prize[]
                )
              : getFirstPool(
                  prizes as Prize[]
                );

          if (
            availablePrizes.length ===
            0
          ) {

            console.error(
              "NO AVAILABLE PRIZES"
            );

            return;
          }

          /**
           * Sorteo
           */
          const selectedPrize =
            pickPrize(
              availablePrizes
            );

          /**
           * Resultado final
           */
          const finalResult: ResultData =
            {

              won:
                selectedPrize.type !==
                  "lose" &&
                selectedPrize.type !==
                  "retry",

              prize:
                selectedPrize
            };

          /**
           * Guardar resultado oficial
           */
          const {
            error:
              updateError
          } = await supabase
            .from(
              "game_sessions"
            )
            .update({

              won:
                finalResult.won,

              prize_id:
                selectedPrize.id,

              prize_type: 
                selectedPrize.type,

              prize_title: 
                selectedPrize.title,

              game_status:
                selectedPrize.type === "lose"
                 ? "LOSE"
                 : selectedPrize.type === "retry"
                 ? "RETRY"
                 : "WIN",

            })
            .eq(
              "id",
              sessionId
            );

          if (
            updateError
          ) {

            console.error(
              "UPDATE ERROR",
              updateError
            );

            return;
          }

          /**
           * Limpiar retry
           */
          if (
            retryMode
          ) {

            sessionStorage.removeItem(
              `retry_${sessionId}`
            );
          }

          setResult(
            finalResult
          );

          setLoading(
            false
          );

          setTimeout(
            async () => {

              setShow(
                true
              );

              /**
               * SOLO primera vez
               */
              await runEffects(
                selectedPrize
              );

            },
            400
          );

        } catch (error) {

          console.error(
            "RESULT ERROR",
            error
          );
        }
      };

    loadResult();

  }, [sessionId]);

  /**
   * LOADER NECESARIO
   * mientras consulta sesión
   * y premio en Supabase
   */
  if (loading) {

    return <ChocolateLoader />;
  }

  if (!result)
    return null;

  const config =
    prizeStyles[
      result.prize.type
    ];

  return (

    <ChocolateBackground>

      {show && (

        <motion.div
          initial={{
            scale: 0.7,
            opacity: 0
          }}
          animate={{
            scale: 1,
            opacity: 1
          }}
          transition={{
            duration: 0.4
          }}
          style={styles.card}
        >

          <motion.div
            style={{
              ...styles.iconBox,
              background: config.bg
            }}
          >
            <span
              style={
                styles.icon
              }
            >
              {
                result.prize
                  .emoji
              }
            </span>

          </motion.div>

          <h1
            style={{
              ...styles.title,
              color:
                config.color
            }}
          >

            {result.prize.type ===
            "lose"
              ? "¡SUERTE LA PRÓXIMA!"
              : "¡FELICIDADES!"}

          </h1>

          <h2
            style={
              styles.subtitle
            }
          >
            {
              result.prize
                .title
            }
          </h2>

          <p
            style={
              styles.prize
            }
          >
            {
              result.prize
                .name
            }
          </p>

          {result.prize.type ===
          "lose" ? (

            <button
              style={{
                ...styles.button,
                background:
                  "#707070"
              }}
              onClick={async () => {
      await playClick();

      /**
       * LIMPIEZA COMPLETA DE SESIÓN (igual que CLAIM)
       */
      if (sessionId) {
        sessionStorage.removeItem(`retry_${sessionId}`);
        sessionStorage.removeItem(`effects_played_${sessionId}`);
        sessionStorage.removeItem(`redeemed_${sessionId}`);
        localStorage.removeItem(`prize_${sessionId}`);
      }

      /**
       * Legacy cleanup (por si existe data vieja)
       */
      sessionStorage.removeItem("redeemed");
      localStorage.removeItem("prize");

      /**
       * Volver a HOME
       */
      router.push("/");
    }}
            >
              FINALIZAR
            </button>

          ) : result.prize
              .type ===
            "retry" ? (

            <button
              style={{
                ...styles.button,
                background:
                  config.bg
              }}
              onClick={async () => {

                await playClick();

                /**
                 * Activar retry
                 */
                sessionStorage.setItem(
                  `retry_${sessionId}`,
                  "true"
                );

                /**
                 * IMPORTANTE:
                 * limpiar resultado anterior
                 */
                sessionStorage.removeItem(
                  `effects_played_${sessionId}`
                );

                  /**
                   * Limpiar premio viejo DB
                   */
                  await supabase
                    .from("game_sessions")
                    .update({
                    prize_id: null,
                    prize_type: null,
                    prize_title: null,
                    won: false,

                  // reset limpio del estado
                    game_status: "PENDING",

                    })
                    .eq("id", sessionId);

                  router.push(
                    `/${slug}/game?session=${sessionId}`
                  );
                }}
              >
                VOLVER A INTENTAR
              </button>

          ) : (

            <button
              style={{
                ...styles.button,
                background:
                  config.bg
              }}
              onClick={async () => {

                await playClick();

                await supabase
                  .from("game_sessions")
                  .update({
                   claimed_prize: true
                 })
                .eq("id", sessionId);

                localStorage.setItem(
                  `prize_${sessionId}`,
                  JSON.stringify(
                    result
                  )
                );

                router.push(
                  `/${slug}/claim?session=${sessionId}`
                );
              }}
            >
              RECLAMAR PREMIO
            </button>

          )}

        </motion.div>
      )}

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
    background: "#fff",
    borderRadius: "30px",
    padding: "30px",
    textAlign: "center",
    boxShadow:
      "0 25px 70px rgba(0,0,0,0.25)",
    zIndex: 2,
    position: "relative"
  },

  iconBox: {
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    margin:
      "0 auto 20px",
    display: "flex",
    justifyContent:
      "center",
    alignItems:
      "center"
  },

  icon: {
    fontSize: "70px"
  },

  title: {
    fontSize: "20px",
    fontWeight: "900",
    marginBottom: "15px"
  },

  subtitle: {
    fontSize: "20px",
    fontWeight: "900",
    marginBottom: "15px",
    color: "#000000"
  },

  prize: {
    fontSize: "20px",
    marginBottom: "20px",
    color: "#000000"
  },

  button: {
    width: "100%",
    padding: "16px",
    borderRadius: "50px",
    border: "none",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer"
  }
};