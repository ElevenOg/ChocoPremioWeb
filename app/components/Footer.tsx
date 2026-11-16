import Image from "next/image";
import { ButtonLink } from "./ui/Button";


const links = [
  ["#Comofunciona", "Cómo funciona"],
  ["#experiencia", "Experiencia"],
  ["#premios", "Premios"],
  ["#sobrechocopremio", "Sobre ChocoPremio"],
  ["#activatumarca", "Activa tu marca"],
];

export default function Footer() {
  return (
    <footer className="bg-[#4d3800] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-4 lg:gap-10 lg:py-12">
        <div className="flex min-w-0 flex-col items-center gap-3 sm:items-start">
          <Image
            src="/images/logoCP.webp"
            width={468}
            height={644}
            unoptimized
            alt="ChocoPremio"
            draggable={false}
            className="h-auto w-25 select-none"
          />

          <h2 className="text-xl font-black">
            CHOCOPREMIO
          </h2>

          <p className="max-w-xs text-sm leading-6 text-[#f3e6c8]">
            ChocoPremio transforma cada chocolate en una
            experiencia interactiva llena de sorpresas.
          </p>
        </div>

        <nav aria-label="Secciones de ChocoPremio">
          <h2 className="mb-3 text-base font-bold">
            Navegación
          </h2>

          <ul>
            {links.map(([href, label]) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex min-h-11 items-center text-sm text-[#f3e6c8] hover:text-white"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-base font-bold">
            Comercios
          </h2>

          <ButtonLink variant="custom"
            href="/dashboard/login"
            loadingLabel="Abriendo acceso a comercios"
            className="cp-touch-action rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#4d3800]"
          >
            Acceso comercios
          </ButtonLink>
        </div>

        <div className="min-w-0">
          <h2 className="mb-3 text-base font-bold">
            Contacto
          </h2>

          <a
            href="mailto:comercial@chocopremio.com"
            className="inline-flex min-h-11 items-center break-all text-sm text-[#f3e6c8]"
          >
            comercial@chocopremio.com
          </a>

          <div className="mt-3">
            <a
              href="https://wa.me/573187649168?text=Hola%20ChocoPremio,%20quiero%20más%20información."
              target="_blank"
              rel="noopener noreferrer"
              className="cp-touch-action rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-[#073b1a]"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div
        className="border-t border-white/15 px-5 pt-4 text-center text-xs leading-6 text-[#ead9b3]"
        style={{
          paddingBottom:
            "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        © 2026 ChocoPremio — Design by{" "}
        <a
          href="https://elevenog.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white"
        >
          ElevenOg Studio
        </a>
      </div>
    </footer>
  );
}
