"use client";

import { type ElementType, type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Candy,
  QrCode,
  Gamepad2,
  Percent,
  Gift,
  PartyPopper,
  Sparkles,
  Trophy,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  MessageCircle
} from "lucide-react";

import Footer from "./components/Footer";
import useBlockZoom from "./components/useBlockZoom";

// Variants reutilizables para las animaciones de entrada al hacer scroll
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: EASE_OUT },
  }),
};

// Espaciado uniforme para TODAS las secciones -> ritmo simétrico
// de sección a sección en toda la página (mobile y desktop).
const SECTION_SPACING = "px-5 py-8 md:py-12";

const COMO_FUNCIONA = [
  {
    icon: Candy,
    title: "Adquirir chocolate",
    text: "Se adquiere un chocolate participante en uno de nuestros comercios aliados.",
  },
  {
    icon: QrCode,
    title: "Escanear el QR",
    text: "Se Escanea el código QR incluido en el chocolate para iniciar la experiencia.",
  },
  {
    icon: Gamepad2,
    title: "Jugar y descubrir",
    text: "Se rompe el chocolate virtual y se descubren descuentos, productos gratis o premios sorpresa.",
  },
];

const PREMIOS = [
  {
    icon: Percent,
    title: "Descuentos",
    text: "Descuentos especiales para utilizar en comercios participantes.",
  },
  {
    icon: Gift,
    title: "Productos gratis",
    text: "Algunos chocolates esconden productos totalmente gratis para los ganadores.",
  },
  {
    icon: PartyPopper,
    title: "Premios sorpresa",
    text: "Recompensas especiales disponibles durante la promoción.",
  },
];

// Badge de sección reutilizable (eyebrow)
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[#4d3800] shadow-sm md:text-xs">
      {children}
    </span>
  );
}

// Tarjeta con icono para las secciones "Cómo funciona" y "Premios"
function IconCard({
  icon: Icon,
  title,
  text,
  index,
}: {
  icon: ElementType;
  title: string;
  text: string;
  index: number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      custom={index * 0.12}
      className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg shadow-[#4d3800]/5 ring-1 ring-black/2 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Franja de acento: arriba en mobile, a la izquierda en desktop.
          Mismo lenguaje visual que la tarjeta de "Activa tu marca". */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-[#4d3800] via-[#8a6a1f] to-[#4d3800] md:inset-y-0 md:inset-x-auto md:left-0 md:h-full md:w-1.5 md:bg-linear-to-b"
        aria-hidden="true"
      />

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-[#fff1d6] to-[#f6ddb1] text-[#4d3800] transition-transform duration-300 group-hover:scale-105">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>

      <h3 className="mt-4 text-xl font-extrabold">{title}</h3>

      {/* Separador sutil, igual al usado en "Activa tu marca" */}
      <div className="mx-auto mt-3 h-px w-12 bg-[#ead9b3]" aria-hidden="true" />

      <p className="mt-3 text-base leading-7 text-[#6b4f2a]">{text}</p>
    </motion.div>
  );
}

/* -----------------------------------------------------------
   VideoDemo: celular acostado (horizontal) con video 16:9 y
   controles propios (play/pause, mute, fullscreen).
----------------------------------------------------------- */
function VideoDemo({
  sectionId,
  eyebrow,
  title,
  description,
}: {
  sectionId?: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  // Si el usuario hace scroll y se aleja del video mientras suena,
  // se pausa solo -evita que siga sonando fuera de pantalla.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !el.paused) {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Libera el bloqueo de orientación si el usuario sale de
  // fullscreen con Esc en vez del botón (evita quedar "trabado"
  // en landscape). Aplica al fullscreen "estándar" (Android/PC).
  // También corrige el bug de Android donde, al salir de
  // fullscreen, la página queda corrida hacia la izquierda con
  // una franja blanca a la derecha (desincronización del scroll
  // horizontal tras el reflow del layout).
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        const orientation = screen.orientation as ScreenOrientation & {
          unlock?: () => void;
        };
        orientation?.unlock?.();

        // Reset del scroll horizontal, doble pasada:
        // una inmediata y otra tras el repaint del navegador.
        window.scrollTo(0, window.scrollY);
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;

        requestAnimationFrame(() => {
          window.scrollTo(0, window.scrollY);
          document.documentElement.scrollLeft = 0;
          document.body.scrollLeft = 0;
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Sincroniza el ícono de play/pause cuando el usuario sale del
  // fullscreen NATIVO de iOS (por ejemplo tocando "Listo" arriba),
  // ya que ese fullscreen no pasa por el evento "fullscreenchange".
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const iosVideo = video as HTMLVideoElement & {
      onwebkitendfullscreen?: (() => void) | null;
    };

    const handleEnd = () => {
      setPlaying(!video.paused);
    };

    iosVideo.onwebkitendfullscreen = handleEnd;
    return () => {
      iosVideo.onwebkitendfullscreen = null;
    };
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      el.play();
      setPlaying(true);
      setStarted(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    // Detecta iOS (iPhone/iPad/iPod). Safari en iOS NO soporta
    // requestFullscreen() sobre un <div>, solo sobre el propio
    // <video> mediante la API propietaria webkitEnterFullscreen.
    // Por eso en iPhone el botón no hacía nada mientras que en
    // Android y PC sí funcionaba con requestFullscreen normal.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const iosVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    };

    if (isIOS && iosVideo.webkitEnterFullscreen) {
      // El player nativo de iOS abre en fullscreen y encuadra el
      // video horizontal automáticamente; no necesita orientation.lock
      // (iOS lo ignora de todas formas).
      if (!iosVideo.webkitDisplayingFullscreen) {
        try {
          iosVideo.webkitEnterFullscreen();
        } catch {
          // Si falla, seguimos sin romper la experiencia.
        }
      } else {
        iosVideo.webkitExitFullscreen?.();
      }
      return;
    }

    // Resto de navegadores (Android, desktop): comportamiento original.
    // NO forzamos landscape: si el celular está en vertical, el
    // video (horizontal) queda con franjas negras arriba/abajo,
    // igual que el reproductor nativo de iOS.
    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen?.();
      } catch {
        // Si el navegador no soporta fullscreen, seguimos
        // igual sin romper la experiencia.
      }
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <section id={sectionId} className={SECTION_SPACING}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center"
        >
          <Eyebrow>
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </Eyebrow>

          <h2 className="mt-4 text-2xl font-black md:text-3xl">{title}</h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-[#6b4f2a] md:text-lg">
            {description}
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          custom={0.15}
          className="mt-10 flex justify-center"
        >
          <div className="relative">
            {/* Glow decorativo detrás del marco, mismo lenguaje visual
                que el resto de la página (tonos chocolate/dorado) */}
            <div
              className="pointer-events-none absolute -inset-6 rounded-[3rem] bg-linear-to-br from-[#ffe9b8] via-[#fdeccf] to-transparent opacity-70 blur-2xl"
              aria-hidden="true"
            />

            {/* Marco tipo teléfono acostado (horizontal), único formato */}
            <div className="relative h-47.5 w-85 rounded-[2.5rem] border-[6px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_30px_80px_rgba(77,56,0,0.35)] md:h-75 md:w-135">
              {/* Notch al costado izquierdo, propio del formato acostado */}
              <div className="absolute left-0 top-1/2 z-20 h-24 w-5 -translate-y-1/2 rounded-r-xl bg-[#1a1a1a]" />

              <div
                ref={containerRef}
                className="group relative h-full overflow-hidden rounded-4xl bg-black"
              >
                <video
                  ref={videoRef}
                  className="h-full w-full bg-black object-contain"
                  src="/video/video.MP4"
                  poster="/images/cap.webp"
                  playsInline
                  preload="metadata"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />

                {/* Capa táctil sobre TODO el mockup: tocar en cualquier
                    parte de la pantalla del celular reproduce o pausa
                    (incluye las franjas negras del object-contain, no
                    solo el video en sí). Permanece montada siempre;
                    solo el ícono central aparece/desaparece según el
                    estado, para que no haya zonas "muertas" al tocar. */}
                <button
                  onClick={togglePlay}
                  aria-label={
                    playing ? "Pausar video" : started ? "Reanudar video" : "Reproducir video"
                  }
                  className="absolute inset-0 z-0 flex items-center justify-center bg-transparent"
                >
                  {!playing && (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition-transform hover:scale-105">
                      <Play className="ml-1 h-7 w-7 text-[#4d3800]" fill="currentColor" />
                    </span>
                  )}
                </button>

                {/* Barra de controles inferior: mute + fullscreen.
                    stopPropagation para que tocar estos botones NO
                    dispare también el play/pause de la capa de arriba. */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-linear-to-t from-black/60 to-transparent px-3 pb-3 pt-8"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    aria-label={muted ? "Activar sonido" : "Silenciar"}
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4d3800] shadow-lg transition duration-200 hover:scale-105 hover:bg-[#fff6e4] active:scale-95"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    aria-label="Pantalla completa"
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4d3800] shadow-lg transition duration-200 hover:scale-105 hover:bg-[#fff6e4] active:scale-95"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const router = useRouter();

  // Bloquea el zoom (pinch y doble toque) en esta página
  useBlockZoom();

  return (
    <>
      {/* Fondo fijo: blanco arriba -> café claro abajo. Siempre visible en pantalla,
          sin importar el scroll (position: fixed, no depende de bg-attachment que
          falla en Safari / iOS). */}
      <div
        className="fixed inset-0 z-0 bg-linear-to-b from-white via-[#fff6e4] to-[#f6ddb1]"
        aria-hidden="true"
      />

      <main className="relative z-10 min-h-screen text-[#4d3800]">
        {/* Chocolate derretido decorativo */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-50 w-full"
          style={{ top: "-40px" }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            style={{ width: "100%", height: "clamp(130px, 22vh, 240px)" }}
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
        </div>

        {/* HERO
            El espacio superior ahora es responsive: en mobile queda
            igual de bien que antes, pero en desktop/tablet respira
            más y ya no se ve "pegado" al chocolate derretido. */}
        <section className="flex min-h-[40vh] items-center justify-center px-5 pt-30 pb-8 md:pt-40 md:pb-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mx-auto w-full max-w-5xl text-center"
          >
            <Eyebrow>
              <Sparkles className="h-3.5 w-3.5" />
              ROMPE. DESCUBRE. GANA.
            </Eyebrow>

            <img
              src="/images/logoCP.webp"
              alt="LogoCP"
              draggable={false}
              onClick={() => router.push("/dashboard/login")}
              className="mt-5 w-25 md:w-35 mx-auto cursor-pointer select-none transition-transform hover:scale-110 active:scale-95"
            />

            <h1 className="mt-4 text-2xl font-black leading-none md:text-3xl">
              CHOCOPREMIO
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6b4f2a] md:text-lg">
              Descubre cómo ChocoPremio conecta comercios y clientes mediante experiencias interactivas, promociones y premios.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#Comofunciona"
                className="w-38 rounded-full bg-[#4d3800] px-6 py-3 text-center text-sm font-bold text-white transition hover:scale-105"
              >
                Cómo funciona
              </a>

              <a
                href="#premios"
                className="w-38 rounded-full border border-gray-300 bg-white px-6 py-3 text-center text-sm font-bold transition hover:scale-105"
              >
                Premios
              </a>
            </div>
          </motion.div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="Comofunciona" className={SECTION_SPACING}>
          <div className="mx-auto max-w-6xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <Eyebrow>CÓMO FUNCIONA</Eyebrow>

              <h2 className="mt-4 text-2xl font-black md:text-3xl">
                ¿Cómo jugar?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base text-[#6b4f2a] md:text-lg">
                Cada chocolate participante incluye un código QR para jugar, participar y ganar premios.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {COMO_FUNCIONA.map((item, i) => (
                <IconCard key={item.title} index={i} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* VIDEO DEMO (horizontal, único formato) */}
        <VideoDemo
          sectionId="experiencia"
          eyebrow="EXPERIENCIA"
          title="Más que un chocolate"
          description="Desde el primer bocado hasta descubrir el premio, conoce la experiencia en ChocoPremio."
        />

        {/* PREMIOS */}
        <section id="premios" className={SECTION_SPACING}>
          <div className="mx-auto max-w-6xl text-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              <Eyebrow>
                <Trophy className="h-3.5 w-3.5" />
                PREMIOS
              </Eyebrow>

              <h2 className="mt-4 text-2xl font-black md:text-3xl">
                Premios
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base text-[#6b4f2a] md:text-lg">
                Cada chocolate puede esconder una sorpresa diferente. Descubre los beneficios disponibles.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PREMIOS.map((item, i) => (
                <IconCard key={item.title} index={i} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* SOBRE CHOCOPREMIO */}
        <section id="sobrechocopremio" className={`${SECTION_SPACING} mb-7 md:mb-10`}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mx-auto max-w-4xl text-center"
          >
            <Eyebrow>SOBRE CHOCOPREMIO</Eyebrow>

            <h2 className="mt-4 text-2xl font-black md:text-3xl">
              ¿Qué es ChocoPremio?
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#6b4f2a] md:text-lg">
              ChocoPremio conecta comercios y clientes mediante una experiencia
              digital interactivas. Cada comercio define sus promociones,
              premios y condiciones para que los participantes puedan jugar,
              descubrir resultados y reclamar premios fácilmente.
            </p>
          </motion.div>
        </section>

        {/* EXPERIENCIA / CTA WHATSAPP */}
        <section id="activatumarca" className="px-5 pt-0 pb-8 md:pt-0 md:pb-12 mb-10 md:mb-20">
          <div className="mx-auto max-w-4xl">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="text-center"
            >
              <Eyebrow>
                <Sparkles className="h-3.5 w-3.5" />
                ACTIVA TU MARCA
              </Eyebrow>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              custom={0.1}
              className="relative mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#4d3800]/10 ring-1 ring-black/5 md:flex md:items-center"
            >
              {/* Franja decorativa: arriba en mobile, a la izquierda en desktop */}
              <div
                className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-[#4d3800] via-[#8a6a1f] to-[#4d3800] md:inset-y-0 md:inset-x-auto md:left-0 md:h-full md:w-1.5 md:bg-linear-to-b"
                aria-hidden="true"
              />

              {/* FOTO */}
              <div className="relative flex w-full items-center justify-center px-10 pt-10 pb-4 md:w-[45%] md:p-15">
                <div className="relative aspect-9/16 w-70 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 sm:w-80 md:w-full md:max-w-sm">
                  <img
                    src="/images/fotoCP.webp"
                    alt="Experiencia ChocoPremio"
                    draggable={false}
                    className="h-full w-full select-none object-contain"
                  />
                </div>

                {/* Logo flotante sobre la foto */}
                <img
                  src="/images/logoCP.webp"
                  alt="LogoCP"
                  draggable={false}
                  className="absolute left-1/2 top-4 h-12 w-12 -translate-x-1/2 select-none rounded-full bg-white p-2 shadow-lg ring-1 ring-black/5 md:h-14 md:w-14"
                />
              </div>

              {/* TEXTO */}
              <div className="flex w-full flex-col items-center justify-center gap-5 px-5 pt-5 pb-10 text-center md:w-[50%] md:p-2">
                <p className="max-w-md text-base leading-7 md:text-lg">
                  <span className="font-bold text-[#4d3800]">
                    Las mejores campañas no solo se ven…
                    <span className="block">
                    se viven.
                    </span>
                  </span>
                </p>

                {/* Separador */}
                <div className="mx-auto h-px w-16 bg-[#ead9b3]" aria-hidden="true" />

                <p className="max-w-md text-base leading-7 text-[#6b4f2a] md:text-lg">
                  En Choco Premio Experiencias convertimos un simple chocolate en una
                  experiencia que conecta personas con marcas, genera emoción y crea
                  recuerdos que permanecen.
                </p>

                {/* Separador */}
                <div className="mx-auto h-px w-16 bg-[#ead9b3]" aria-hidden="true" />

                <p className="max-w-md text-base leading-7 text-[#6b4f2a] md:text-lg">
                    ¿Te imaginas esta activación en tu empresa o centro comercial?
                  
                  <span className="mt-3 block font-bold text-[#4d3800]">
                    Escríbenos y hagámosla realidad.
                  </span>
                </p>
                <a
                  href="https://wa.me/573187649168?text=Hola%20ChocoPremio,%20quiero%20más%20información."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#4d3800] px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
                >
                  <MessageCircle className="h-4 w-4" />
                  Escríbenos
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}