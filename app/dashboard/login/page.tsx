"use client";

import { type FormEvent, useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";
import { BrandBackground, BrandBadge } from "../../components/ui/Brand";
import { Button } from "../../components/ui/Button";
import useBlockZoom from "../../components/useBlockZoom";
import { errorMessage, isAbortError, postJson } from "@/lib/client/api";
import styles from "./Login.module.css";
import { clearDashboardBootstrap, setDashboardBootstrap } from "@/lib/client/dashboardBootstrap";
import type { DashboardBootstrap } from "@/lib/dashboard/types";
import { runWhenIdle } from "@/lib/client/idle";

export default function DashboardLogin() {
  useBlockZoom();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => runWhenIdle(() => {
    // Warm the page code without requesting a protected route before login.
    void import("../Dashboard").catch(() => undefined);
  }), []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) { setError("Completa todos los campos"); return; }
    submitting.current = true;
    setLoading(true);
    setError("");
    controller.current = new AbortController();
    try {
      clearDashboardBootstrap();
      const { dashboard } = await postJson<{ dashboard: DashboardBootstrap }>("/api/dashboard/login", { username: cleanUsername, password }, controller.current.signal);
      if (controller.current.signal.aborted) return;
      setDashboardBootstrap(dashboard);
      router.prefetch("/dashboard");
      router.replace("/dashboard");
    } catch (cause) {
      if (isAbortError(cause)) return;
      submitting.current = false;
      setError(errorMessage(cause));
      setLoading(false);
    }
  };

  return (
    <>
      <BrandBackground className="fixed inset-0 z-0" />

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-5 py-6 text-[#4d3800]">
        <form onSubmit={handleLogin}
          className={`${styles.card} relative z-10 w-full max-w-100 rounded-[30px] bg-white/95 p-7 text-center shadow-[0_20px_56px_rgba(0,0,0,0.2)] ring-1 ring-black/5 backdrop-blur-sm`}
        >
          <div className={`${styles.stagger} `}>
            <BrandBadge>
              <Sparkles className="h-3.5 w-3.5" />
              PANEL DE COMERCIOS
            </BrandBadge>
          </div>

          <Link
            href="/"
            prefetch={false}
            aria-label="Volver al inicio de ChocoPremio"
            className={`${styles.stagger} mt-3 mx-auto block w-15 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c47a00] md:w-20`}
          >
            <Image
              src="/images/logoCP.webp"
              width={468}
              height={644}
              unoptimized
              alt="ChocoPremio"
              draggable={false}
              className="h-auto w-full select-none"
            />
          </Link>

          <h1 className={`${styles.stagger}  mt-4 text-2xl font-black leading-none md:text-3xl`}>
            CHOCOPREMIO
          </h1>

          <p className={`${styles.stagger}  mx-auto mt-3 max-w-xs text-sm leading-6 text-[#70502f]`}>
            Ingresa a tu panel de estadísticas
          </p>

          <div className={`${styles.stagger}  mt-7 space-y-3 text-left`}>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b39a6d]"
                strokeWidth={2}
              />
              <input
                type="text"
                aria-label="Usuario"
                required
                maxLength={100}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Usuario"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}

                disabled={loading}
                className="w-full rounded-2xl border-2 border-[#ead9b3] bg-[#fffaf0] py-3.5 pl-11 pr-4 text-base text-[#4d3800] outline-none transition-colors duration-200 placeholder:text-[#b39a6d] focus:border-[#4d3800] disabled:opacity-60"
              />
            </div>

            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#b39a6d]"
                strokeWidth={2}
              />
              <input
                type={showPassword ? "text" : "password"}
                aria-label="Contraseña"
                required
                maxLength={1024}
                placeholder="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}

                disabled={loading}
                className="w-full rounded-2xl border-2 border-[#ead9b3] bg-[#fffaf0] py-3.5 pl-11 pr-11 text-base text-[#4d3800] outline-none transition-colors duration-200 placeholder:text-[#b39a6d] focus:border-[#4d3800] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b39a6d] transition-colors hover:text-[#4d3800]"
              >
                {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
              </button>
            </div>
          </div>

          <div className={`${styles.errorWrap} ${error ? styles.errorWrapShow : ""}`}>
            <div className={styles.errorInner}>
              <div role="alert" className={`${styles.errorContent} flex items-center justify-center gap-1.5 text-sm font-bold text-[#b23b3b]`}>
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                {error}
              </div>
            </div>
          </div>

          <Button type="submit"
            loading={loading}
            loadingLabel="Ingresando al panel"
            disabled={loading}
            className={`${styles.button} mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#4d3800] py-4 text-[17px] font-black text-white disabled:cursor-wait disabled:opacity-85`}
          >
            INGRESAR
          </Button>

          <p className={`${styles.stagger}  mt-4 text-xs text-[#70502f]`}>
            Acceso exclusivo para comercios afiliados
          </p>
        </form>
      </main>
    </>
  );
}
