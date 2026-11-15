import Image from "next/image";
import Link from "next/link";
import {
  Candy, QrCode, Gamepad2, Percent, Gift, PartyPopper,
  Sparkles, Trophy, MessageCircle, type LucideIcon,
} from "lucide-react";
import Footer from "./components/Footer";
import { HomeEnhancements, VideoPlayer } from "./components/HomeExperience";
import { BrandBackground, BrandBadge, ChocolateDecoration } from "./components/ui/Brand";
import { ButtonLink } from "./components/ui/Button";
import styles from "./Home.module.css";

const SECTION_SPACING = "px-5 py-8 md:py-12";
const BOX_TONES = ["rose", "jade", "amber", "violet"];

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
    text: "Se elige una caja de regalo y se descubren descuentos, productos gratis o premios sorpresa.",
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

function IconCard({
  icon: Icon,
  title,
  text,
  index,
  colorOffset = 0,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  index: number;
  colorOffset?: number;
}) {
  return (
    <div data-home-reveal
      data-home-delay={index * 120}
      data-box-tone={BOX_TONES[(index + colorOffset) % BOX_TONES.length]}
      className={styles.iconCard + " group relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg shadow-[#4d3800]/5 ring-1 ring-black/2 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"}
    >

      <div
        className={styles.cardAccent}
        aria-hidden="true"
      />

      <div className={styles.iconBadge + " mx-auto flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"}>
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>

      <h3 className="mt-4 text-xl font-extrabold">{title}</h3>

      <div className="mx-auto mt-3 h-px w-12 bg-[#ead9b3]" aria-hidden="true" />

      <p className="mt-3 text-base leading-7 text-[#6b4f2a]">{text}</p>
    </div>
  );
}

export default function Home() {

  return (
    <>
      <HomeEnhancements />

      <BrandBackground />

      <main
        data-home-root
        className={styles.root + " relative min-h-screen text-[#4d3800]"}
        style={{ transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}
      >

        <ChocolateDecoration />

        <section className="flex min-h-[40vh] items-center justify-center px-5 pt-30 pb-8 md:pt-40 md:pb-10">
          <div data-home-reveal
            className={styles.hero + " mx-auto w-full max-w-5xl text-center"}
          >
            <BrandBadge>
              <Sparkles className="h-3.5 w-3.5" />
              ELIGE. DESCUBRE. GANA.
            </BrandBadge>

            <Link href="/dashboard/login" prefetch={false} aria-label="Acceso de comercios" className="mt-5 block w-25 md:w-35 mx-auto cursor-pointer select-none transition-transform hover:scale-110 active:scale-95">
              <Image src="/images/logoCP.webp" width={468} height={644} unoptimized loading="eager" fetchPriority="high" alt="LogoCP" draggable={false} className="h-auto w-full" />
            </Link>

            <h1 className="mt-4 text-2xl font-black leading-none md:text-3xl">
              CHOCOPREMIO
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#6b4f2a] md:text-lg">
              Descubre cómo ChocoPremio conecta comercios y clientes mediante experiencias interactivas, promociones y premios.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="#Comofunciona" className="w-38">Cómo funciona</ButtonLink>

              <ButtonLink href="#premios" variant="secondary" className={styles.prizesButton + " w-38"}>Premios</ButtonLink>
            </div>
          </div>
        </section>

        <section id="Comofunciona" className={SECTION_SPACING}>
          <div className="mx-auto max-w-6xl text-center">
            <div data-home-reveal
            >
              <BrandBadge>CÓMO FUNCIONA</BrandBadge>

              <h2 className="mt-4 text-2xl font-black md:text-3xl">
                ¿Cómo jugar?
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base text-[#6b4f2a] md:text-lg">
                Cada chocolate participante incluye un código QR para jugar, participar y ganar premios.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {COMO_FUNCIONA.map((item, i) => (
                <IconCard key={item.title} index={i} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section id="experiencia" className={SECTION_SPACING}>
          <div className="mx-auto max-w-6xl">
            <div data-home-reveal className="text-center">
              <BrandBadge><Sparkles className="h-3.5 w-3.5" />EXPERIENCIA</BrandBadge>
              <h2 className="mt-4 text-2xl font-black md:text-3xl">Más que un chocolate</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-[#6b4f2a] md:text-lg">
                Desde el primer bocado hasta descubrir el premio, conoce la experiencia en ChocoPremio.
              </p>
            </div>
            <div data-home-reveal data-home-delay={150} className="mt-10 flex justify-center">
              <VideoPlayer />
            </div>
          </div>
        </section>

        <section id="premios" className={SECTION_SPACING}>
          <div className="mx-auto max-w-6xl text-center">
            <div data-home-reveal
            >
              <BrandBadge>
                <Trophy className="h-3.5 w-3.5" />
                PREMIOS
              </BrandBadge>

              <h2 className="mt-4 text-2xl font-black md:text-3xl">
                Premios
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base text-[#6b4f2a] md:text-lg">
                Cada chocolate puede esconder una sorpresa diferente. Descubre los beneficios disponibles.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {PREMIOS.map((item, i) => (
                <IconCard key={item.title} index={i} colorOffset={3} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section id="sobrechocopremio" className={`${SECTION_SPACING} mb-7 md:mb-10`}>
          <div data-home-reveal
            className="mx-auto max-w-4xl text-center"
          >
            <BrandBadge>SOBRE CHOCOPREMIO</BrandBadge>

            <h2 className="mt-4 text-2xl font-black md:text-3xl">
              ¿Qué es ChocoPremio?
            </h2>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-[#6b4f2a] md:text-lg">
              ChocoPremio conecta comercios y clientes mediante una experiencia
              digital interactivas. Cada comercio define sus promociones,
              premios y condiciones para que los participantes puedan jugar,
              descubrir resultados y reclamar premios fácilmente.
            </p>
          </div>
        </section>

        <section id="activatumarca" className="px-5 pt-0 pb-8 md:pt-0 md:pb-12 mb-10 md:mb-20">
          <div className="mx-auto max-w-4xl">
            <div data-home-reveal
              className="text-center"
            >
              <BrandBadge>
                <Sparkles className="h-3.5 w-3.5" />
                ACTIVA TU MARCA
              </BrandBadge>
            </div>

            <div data-home-reveal
              data-home-delay={100}
              className="relative mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#4d3800]/10 ring-1 ring-black/5 md:flex md:items-center"
            >

              <div
                className={styles.brandAccent}
                aria-hidden="true"
              />

              <div className="relative flex w-full items-center justify-center px-10 pt-10 pb-4 md:w-[45%] md:p-15">
                <div className="relative aspect-9/16 w-70 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 sm:w-80 md:w-full md:max-w-sm">
                  <Image src="/images/fotoCP.webp" width={768} height={1367} unoptimized
                    alt="Experiencia ChocoPremio"
                    draggable={false}
                    className="h-full w-full select-none object-contain"
                  />
                </div>

                <Image src="/images/logoCP.webp" width={468} height={644} unoptimized
                  alt="LogoCP"
                  draggable={false}
                  className="absolute left-1/2 top-4 h-12 w-12 -translate-x-1/2 select-none rounded-full bg-white p-2 shadow-lg ring-1 ring-black/5 md:h-14 md:w-14"
                />
              </div>

              <div className="flex w-full flex-col items-center justify-center gap-5 px-5 pt-5 pb-10 text-center md:w-[50%] md:p-2">
                <p className="max-w-md text-base leading-7 md:text-lg">
                  <span className="font-bold text-[#4d3800]">
                    Las mejores campañas no solo se ven…
                    <span className="block">
                    se viven.
                    </span>
                  </span>
                </p>

                <div className="mx-auto h-px w-16 bg-[#ead9b3]" aria-hidden="true" />

                <p className="max-w-md text-base leading-7 text-[#6b4f2a] md:text-lg">
                  En Choco Premio Experiencias convertimos un chocolate en una
                  experiencia que conecta personas con marcas, genera emoción y crea
                  recuerdos que permanecen.
                </p>

                <div className="mx-auto h-px w-16 bg-[#ead9b3]" aria-hidden="true" />

                <p className="max-w-md text-base leading-7 text-[#6b4f2a] md:text-lg">
                    ¿Te imaginas esta activación en tu empresa o centro comercial?

                  <span className="mt-3 block font-bold text-[#4d3800]">
                    Escríbenos y hagámosla realidad.
                  </span>
                </p>
                <ButtonLink href="https://wa.me/573187649168?text=Hola%20ChocoPremio,%20quiero%20más%20información." target="_blank" size="large" className="mt-2 shadow-lg hover:shadow-xl">
                  <MessageCircle className="h-4 w-4" />Escríbenos
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}
