"use client";

import { useEffect, useRef, useState } from "react";

import Footer from "./components/Footer";

import { useRouter } from "next/navigation";

import { motion } from "framer-motion";

export default function Home() {

  const router = useRouter();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/click.mp3");
    audioRef.current.volume = 0.45;
    audioRef.current.load();
  }, []);

  const playClick = () => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  return (
    <main
  className="
    min-h-screen
    text-[#4d3800]
    bg-[radial-gradient(circle_at_top,#fffdf6_0%,#fff6e4_35%,#fdeccf_60%,#f6ddb1_100%)]
    bg-fixed
  "
>
  {/* Chocolate derretido fijo */}
<div className="absolute top-0 left-0 w-full z-50 pointer-events-none"
     style={{ top: "-20px" }}
   >
  <svg
    viewBox="0 0 100 40"
    preserveAspectRatio="none"
    style={{
      width: "100%",
      height: "clamp(130px, 22vh, 240px)",
      filter: "drop-shadow(0 12px 25px rgba(0,0,0,0.25))"
    }}
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

      {/* HERO */}
      <section className="flex min-h-[60vh] items-center justify-center px-5 py-10 mt-28">
        <div className="mx-auto w-full max-w-5xl text-center">
          <span className="inline-flex rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-[0.2em] shadow-sm md:text-xs">
            ROMPE. DESCUBRE. GANA.
          </span>

          <div
            onClick={() => {
              playClick?.();
              router.push("/dashboard/login");
           }}
           className="mt-5 text-6xl md:text-7xl cursor-pointer select-none transition-transform hover:scale-110 active:scale-95"
         >
           🍫
       </div>

          <h1 className="mt-4 text-2xl font-black leading-none md:text-3xl">
            CHOCOPREMIO
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-700 md:text-lg">
            Rompe el chocolate y descubre si ganaste un premio. Participa en
            las promociones de nuestros comercios aliados y reclama
            descuentos, productos, bonos y premios sorpresa.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#Comofunciona"
              onClick={playClick}
              className="rounded-full bg-[#4d3800] px-6 py-3 text-sm font-bold text-white transition hover:scale-105"
            >
              Cómo funciona
            </a>

            <a
              href="#premios"
              onClick={playClick}
              className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-bold transition hover:scale-105"
            >
              Premios
            </a>
          </div>
        </div>
      </section>

      {/* EXPERIENCIA */}
<section
  id="Comofunciona"
  className="px-5 pt-2 pb-10"
>
  <div className="mx-auto max-w-6xl text-center">
    <span className="inline-flex rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-wider md:text-xs">
      CÓMO FUNCIONA
    </span>

    <h2 className="mt-4 text-2xl font-black md:text-3xl">
      ¿Cómo jugar?
    </h2>

    <p className="mx-auto mt-4 max-w-2xl text-base text-gray-700 md:text-lg">
      Compra tu chocolate, escanea el código QR y descubre si eres uno de los ganadores.
    </p>

    <div className="mt-10 grid gap-5 md:grid-cols-3">
      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="text-4xl">🍫</div>

        <h3 className="mt-4 text-xl font-extrabold">
          Compra tu chocolate
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Adquiere un chocolate participante en uno de nuestros comercios aliados.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="text-4xl">📱</div>

        <h3 className="mt-4 text-xl font-extrabold">
          Escanea el QR
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Escanea el código QR único incluido en tu chocolate para iniciar la experiencia.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="text-4xl">🎁</div>

        <h3 className="mt-4 text-xl font-extrabold">
          Juega y descubre
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Rompe el chocolate virtual y descubre si ganaste descuentos, productos gratis o premios sorpresa.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* PREMIOS */}
<section
  id="premios"
  className="px-5 py-10"
>
  <div className="mx-auto max-w-6xl text-center">
    <span className="inline-flex rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-wider md:text-xs">
      PREMIOS
    </span>

    <h2 className="mt-4 text-2xl font-black md:text-3xl">
      Premios para ti
    </h2>

    <p className="mx-auto mt-4 max-w-2xl text-base text-gray-700 md:text-lg">
      Cada chocolate puede esconder una sorpresa diferente. Descubre si eres uno de los ganadores.
    </p>

    <div className="mt-10 grid gap-5 md:grid-cols-3">
      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="text-4xl">💸</div>

        <h3 className="mt-4 text-xl font-extrabold">
          Descuentos
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Obtén descuentos especiales para utilizar en comercios participantes.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="text-4xl">🎁</div>

        <h3 className="mt-4 text-xl font-extrabold">
          Productos gratis
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Algunos chocolates esconden productos totalmente gratis para los ganadores.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg">
        <div className="text-4xl">🎉</div>

        <h3 className="mt-4 text-xl font-extrabold">
          Premios sorpresa
        </h3>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Descubre recompensas especiales disponibles durante la promoción.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* SOBRE CHOCOPREMIO */}
      <section className="px-5 py-10 md:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-wider md:text-xs">
            SOBRE CHOCOPREMIO
          </span>

          <h2 className="mt-4 text-2xl font-black md:text-3xl">
            ¿Qué es ChocoPremio?
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-gray-700 md:text-lg">
            ChocoPremio conecta comercios y clientes mediante experiencias
            digitales interactivas. Cada comercio define sus promociones,
            premios y condiciones para que los participantes puedan jugar,
            descubrir resultados y reclamar premios fácilmente.
          </p>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      
 <section 
       id="faq"
       className="px-5 pt-10 pb-30 md:pt-14 md:pb-30">
  <div className="mx-auto max-w-4xl">
    <div className="text-center">
      <span className="inline-flex rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-wider md:text-xs">
        PREGUNTAS FRECUENTES
      </span>

      <h2 className="mt-4 text-2xl font-black md:text-3xl">
        Preguntas frecuentes
      </h2>
    </div>

    <div className="mt-10 space-y-4">
      {/* FAQ 1 */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300">
        <button
          onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}
          className="flex w-full items-center justify-between p-6 text-left font-bold"
        >
          ¿Tiene algún costo participar?

          <span
            className={`text-xl transition-transform duration-300 ${
              openFaq === 1 ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            openFaq === 1
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 pb-6 text-gray-600">
            No. La participación está incluida con la compra de un chocolate
            participante. Cada chocolate contiene un código QR único que te da
            una oportunidad para jugar.
          </div>
        </div>
      </div>

      {/* FAQ 2 */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300">
        <button
          onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}
          className="flex w-full items-center justify-between p-6 text-left font-bold"
        >
          ¿Cómo reclamo mi premio?

          <span
            className={`text-xl transition-transform duration-300 ${
              openFaq === 2 ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            openFaq === 2
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 pb-6 text-gray-600">
            Si resultas ganador, recibirás las instrucciones y el código de
            validación para reclamar tu premio en el comercio aliado.
          </div>
        </div>
      </div>

      {/* FAQ 3 */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300">
        <button
          onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}
          className="flex w-full items-center justify-between p-6 text-left font-bold"
        >
          ¿Puedo participar varias veces?

          <span
            className={`text-xl transition-transform duration-300 ${
              openFaq === 3 ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            openFaq === 3
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 pb-6 text-gray-600">
            Sí. Cada chocolate participante incluye una oportunidad de juego.
            Entre más chocolates compres, más oportunidades tendrás de ganar.
          </div>
        </div>
      </div>

      {/* FAQ 4 */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300">
        <button
          onClick={() => setOpenFaq(openFaq === 4 ? null : 4)}
          className="flex w-full items-center justify-between p-6 text-left font-bold"
        >
          ¿Dónde consulto los términos y condiciones?

          <span
            className={`text-xl transition-transform duration-300 ${
              openFaq === 4 ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            openFaq === 4
              ? "max-h-40 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 pb-6 text-gray-600">
            Antes de comenzar la experiencia podrás revisar los términos y
            condiciones completos de la promoción.
          </div>
         </div>
       </div>
     </div>
   </div>

     </section>

        <Footer />
    </main>
  );
}