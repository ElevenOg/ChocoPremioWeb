"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";

import { supabase } from "@/lib/supabase";
import ChocolateLoader from "@/app/components/ChocolateLoader";
import { MIN_LOADING_MS, markNavStart } from "../../components/loaderConfig";
import useBlockZoom from "../../components/useBlockZoom";
import styles from "./Login.module.css";

// Badge reutilizable (idéntico al de la Home)
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ead9b3] bg-white px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[#4d3800] shadow-sm md:text-xs">
      {children}
    </span>
  );
}

export default function DashboardLogin() {
  const router = useRouter();

  // Bloquea el zoom (pinch y doble toque) en esta página
  useBlockZoom();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const handleLogin = useCallback(async () => {
    if (loading) return;

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    setError("");

    if (!cleanUsername || !cleanPassword) {
      setError("Completa todos los campos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("commerces")
        .select("*")
        .eq("username", cleanUsername)
        .eq("password", cleanPassword)
        .eq("active", true)
        .single();

      if (error || !data) {
        setError("Usuario o contraseña incorrectos");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("dashboard_commerce", JSON.stringify(data));

      // Marca el inicio del loader
      markNavStart();

      setRedirecting(true);

      requestAnimationFrame(() => {
        router.replace("/dashboard");
      });
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión");
      setLoading(false);
    }
  }, [username, password, loading, router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  if (redirecting) {
    return <ChocolateLoader />;
  }

  return (
    <>
      {/* Fondo fijo, idéntico al de la Home */}
      <div
        className="fixed inset-0 z-0 bg-linear-to-b from-white via-[#fff6e4] to-[#f6ddb1]"
        aria-hidden="true"
      />

      <main className="relative z-10 flex h-dvh items-center justify-center overflow-hidden px-5 text-[#4d3800]">
        {/* Tarjeta de login — animación 100% CSS (antes framer-motion) */}
        <div
          className={`${styles.card} relative z-10 w-full max-w-100 rounded-[30px] bg-white/95 p-7 text-center shadow-[0_20px_56px_rgba(0,0,0,0.2)] ring-1 ring-black/5 backdrop-blur-sm`}
        >
          <div className={`${styles.stagger} ${styles.d1}`}>
            <Eyebrow>
              <Sparkles className="h-3.5 w-3.5" />
              PANEL DE COMERCIOS
            </Eyebrow>
          </div>

          <img
            src="/images/logoCP.webp"
            alt="LogoCP"
            draggable={false}
            className={`${styles.stagger} ${styles.d2} mt-3 w-15 md:w-20 mx-auto select-none`}
          />

          <h1 className={`${styles.stagger} ${styles.d3} mt-4 text-2xl font-black leading-none md:text-3xl`}>
            CHOCOPREMIO
          </h1>

          <p className={`${styles.stagger} ${styles.d3} mx-auto mt-3 max-w-xs text-sm leading-6 text-[#70502f]`}>
            Ingresa a tu panel de estadísticas
          </p>

          <div className={`${styles.stagger} ${styles.d4} mt-7 space-y-3 text-left`}>
            {/* Usuario */}
            <div className="relative">
              <User
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b39a6d]"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Usuario"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full rounded-2xl border-2 border-[#ead9b3] bg-[#fffaf0] py-3.5 pl-11 pr-4 text-base text-[#4d3800] outline-none transition-colors duration-200 placeholder:text-[#b39a6d] focus:border-[#4d3800] disabled:opacity-60"
              />
            </div>

            {/* Contraseña */}
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b39a6d]"
                strokeWidth={2}
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="w-full rounded-2xl border-2 border-[#ead9b3] bg-[#fffaf0] py-3.5 pl-11 pr-11 text-base text-[#4d3800] outline-none transition-colors duration-200 placeholder:text-[#b39a6d] focus:border-[#4d3800] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b39a6d] transition-colors hover:text-[#4d3800]"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <Eye className="h-5 w-5" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* Error — animado con CSS Grid trick, sin AnimatePresence */}
          <div className={`${styles.errorWrap} ${error ? styles.errorWrapShow : ""}`}>
            <div className={styles.errorInner}>
              <div className={`${styles.errorContent} flex items-center justify-center gap-1.5 text-sm font-bold text-[#b23b3b]`}>
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                {error}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className={`${styles.button} mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#4d3800] py-4 text-[17px] font-black text-white disabled:cursor-wait disabled:opacity-85`}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                INGRESANDO
              </>
            ) : (
              "INGRESAR"
            )}
          </button>

          <p className={`${styles.stagger} ${styles.d6} mt-4 text-xs text-[#70502f]`}>
            Acceso exclusivo para comercios afiliados
          </p>
        </div>
      </main>
    </>
  );
}