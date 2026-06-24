"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#6b4b1f]/20 bg-[#4d3800] text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 text-center md:grid-cols-4 md:text-left">
        {/* LOGO / DESCRIPCIÓN */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div className="text-5xl">🍫</div>

          <h3 className="text-2xl font-black">
            CHOCOPREMIO
          </h3>

          <p className="max-w-xs text-sm leading-relaxed text-[#f3e6c8]">
            Compra tu chocolate, escanea el código QR y descubre al instante
            si ganaste descuentos, productos gratis o premios sorpresa.
          </p>
        </div>

        {/* NAVEGACIÓN */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Navegación
          </h3>

          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="#Comofunciona"
                className="text-[#f3e6c8] transition hover:text-white"
              >
                Cómo funciona
              </a>
            </li>

            <li>
              <a
                href="#premios"
                className="text-[#f3e6c8] transition hover:text-white"
              >
                Premios
              </a>
            </li>

            <li>
              <a
                href="#faq"
                className="text-[#f3e6c8] transition hover:text-white"
              >
                Preguntas frecuentes
              </a>
            </li>
          </ul>
        </div>

        {/* DASHBOARD */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Comercios
          </h3>

          <Link
            href="/dashboard/login"
            className="
              inline-flex
              items-center
              justify-center
              rounded-xl
              bg-white
              px-5
              py-2.5
              font-bold
              text-[#4d3800]
              shadow-md
              transition-all
              duration-200
              hover:scale-105
              hover:bg-[#f8f1e3]
            "
          >
            Dashboard
          </Link>
        </div>

        {/* CONTACTO */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">
            Contacto
          </h3>

          <div className="space-y-2 text-sm text-[#f3e6c8]">
            <p>📧 comercial@chocopremio.com</p>
          </div>

          <a
            href="https://wa.me/573143312475?text=Hola%20ChocoPremio,%20quiero%20más%20información."
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-[#25D366] px-5 py-2 font-bold text-white transition hover:scale-105"
          >
            💬 WhatsApp
          </a>

          <p className="mt-4 text-xs text-[#d8c29a]">
            Descubre tu premio en segundos
          </p>
        </div>
      </div>

      {/* FOOTER INFERIOR */}
      <div className="border-t border-white/10 py-4 text-center text-xs text-[#d8c29a]">
        © 2026 ChocoPremio — Design by{" "}
        <a
          href="https://elevenog.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white transition hover:text-[#f4c86a]"
        >
          ElevenOg Studio
        </a>
      </div>
    </footer>
  );
}