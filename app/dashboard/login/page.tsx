"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

import ChocolateLoader from "@/app/components/ChocolateLoader";

export default function DashboardLogin() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCard(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("commerces")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .eq("active", true)
        .maybeSingle();

      if (error || !data) {
        setError("Usuario o contraseña incorrectos");
        return;
      }

      sessionStorage.setItem(
        "dashboard_commerce",
        JSON.stringify(data)
      );

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ChocolateLoader />;
  }

  return (
    <main
      className="
        h-screen
        overflow-hidden
        flex
        items-center
        justify-center
        px-5
        text-[#4d3800]
        bg-[radial-gradient(circle_at_top,#fffdf6_0%,#fff6e4_35%,#fdeccf_60%,#f6ddb1_100%)]
      "
    >
      {/* Chocolate superior */}
      <div
        className="absolute top-0 left-0 w-full pointer-events-none"
        style={{ top: "-20px" }}
      >
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "clamp(130px,22vh,240px)",
            filter: "drop-shadow(0 12px 25px rgba(0,0,0,0.25))"
          }}
        >
          <path
            d="
              M0 0 H100 V26
              C95 32,92 26,88 26
              C85 26,83 30,80 30
              C77 30,75 26,72 26
              C69 26,67 36,64 36
              C61 36,59 24,56 24
              C53 24,51 30,48 30
              C45 30,43 26,40 26
              C37 26,35 36,32 36
              C29 36,27 26,24 26
              C21 26,19 32,16 32
              C13 32,11 24,8 24
              C5 24,2 32,0 32 Z
            "
            fill="#3f2d00"
          />
        </svg>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "rgba(255,255,255,0.95)",
          borderRadius: "30px",
          padding: "24px 18px",
          textAlign: "center",
          boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
          position: "relative",
          zIndex: 5,

          opacity: showCard ? 1 : 0,
          transform: showCard
            ? "translateY(0px) scale(1)"
            : "translateY(40px) scale(0.95)",

          transition:
            "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)"
        }}
      >
        <div
          style={{
            fontSize: "clamp(60px,12vw,80px)",
            marginTop: "20px",
            transform: showCard ? "translateY(0)" : "translateY(-15px)",
            opacity: showCard ? 1 : 0,
            transition:
              "all 1s cubic-bezier(0.22,1,0.36,1) 0.2s"
          }}
        >
          🍫
        </div>

        <h1
          style={{
            fontSize: "clamp(22px,5vw,28px)",
            fontWeight: 900,
            color: "#4d3800",
            marginTop: "10px"
          }}
        >
          PANEL CHOCOPREMIO
        </h1>

        <p
          style={{
            marginTop: "10px",
            color: "#555",
            fontSize: "15px"
          }}
        >
          Ingresa a tu panel de estadísticas
        </p>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            marginTop: "25px",
            padding: "14px",
            borderRadius: "15px",
            border: "2px solid #4d3800",
            outline: "none",
            fontSize: "16px"
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "14px",
            borderRadius: "15px",
            border: "2px solid #4d3800",
            outline: "none",
            fontSize: "16px"
          }}
        />

        {error && (
          <p
            style={{
              marginTop: "12px",
              color: "#4d3800",
              fontSize: "14px",
              fontWeight: 700
            }}
          >
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "16px",
            borderRadius: "50px",
            border: "none",
            background: "#4d3800",
            color: "#fff",
            fontSize: "17px",
            fontWeight: 900,
            cursor: "pointer"
          }}
        >
          INGRESAR
        </button>

        <p
          style={{
            marginTop: "15px",
            fontSize: "13px",
            color: "#777"
          }}
        >
          Acceso exclusivo para comercios afiliados
        </p>
      </div>
    </main>
  );
}