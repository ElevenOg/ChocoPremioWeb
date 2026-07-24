"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ChocolateLoader from "@/app/components/ChocolateLoader";
import { MIN_LOADING_MS, consumeNavStart } from "../components/loaderConfig";
import useBlockZoom from "../components/useBlockZoom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  QrCode,
  Share2,
  Gamepad2,
  Trophy,
  Gift,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Clock,
  Package,
  RefreshCw,
  Star,
  ShieldCheck,
  LogOut,
  Layers,
} from "lucide-react";

/* ───────── CONFIG ───────── */

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutos
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ───────── TYPES ───────── */

type Commerce = { id: string; name: string };

type Campaign = {
  id: string;
  name: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

type GameSession = {
  scanned_qr: boolean;
  clicked_social: boolean;
  played: boolean;
  claimed_prize: boolean;
  prize_title: string | null;
  prize_type:
    | "small_discount"
    | "medium_discount"
    | "large_discount"
    | "big_discount"
    | "accessory"
    | "retry"
    | "lose"
    | null;
  game_status: "WIN" | "LOSE" | "RETRY" | "PENDING";
};

const fmt = (n: number) => n.toLocaleString("es-CO");

/* ───────── PRIMITIVOS DE UI ───────── */

function MetricCard({
  icon,
  value,
  label,
  dark = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      className="rounded-[20px] p-4 flex flex-col gap-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
      style={{
        background: dark ? "#4D3800" : "#FFFFFF",
        boxShadow: dark
          ? "0 6px 28px rgba(77,56,0,0.22)"
          : "0 2px 14px rgba(77,56,0,0.07)",
      }}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center"
        style={{ background: dark ? "rgba(217,164,65,0.2)" : "#F5EDD8" }}
      >
        <span style={{ color: dark ? "#D9A441" : "#4D3800" }}>{icon}</span>
      </div>
      <div>
        <p
          className="tabular-nums"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "1.9rem",
            fontWeight: 500,
            lineHeight: 1,
            color: dark ? "#D9A441" : "#1A1005",
          }}
        >
          {fmt(value)}
        </p>
        <p
          style={{
            marginTop: 6,
            fontSize: "0.74rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: dark ? "rgba(255,253,247,0.55)" : "#8A7050",
          }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

const FUNNEL_COLORS = ["#4D3800", "#D9A441", "#7A5C30", "#00A814", "#4D3800"];

function FunnelRow({
  step,
  label,
  value,
  pct,
  isLast,
}: {
  step: number;
  label: string;
  value: number;
  pct: number | null;
  isLast: boolean;
}) {
  const color = FUNNEL_COLORS[step - 1] ?? "#4D3800";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center" style={{ width: 44 }}>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 z-10"
          style={{ background: color, boxShadow: `0 0 0 5px ${color}1A` }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            {step}
          </span>
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 20,
              marginTop: 4,
              background: `linear-gradient(to bottom, ${color}40, ${color}08)`,
              borderRadius: 2,
            }}
          />
        )}
      </div>

      <div
        className="flex-1 flex items-center justify-between rounded-2xl px-4 py-3.5 mb-3"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 2px 12px rgba(77,56,0,0.06)",
          border: "1px solid rgba(77,56,0,0.06)",
        }}
      >
        <div>
          <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1A1005", lineHeight: 1.3 }}>
            {label}
          </p>
          {pct !== null && (
            <div className="flex items-center gap-1 mt-1">
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00D11C", flexShrink: 0 }} />
              <p style={{ fontSize: "0.74rem", fontWeight: 600, color: "#00A814" }}>
                {pct}% del paso anterior
              </p>
            </div>
          )}
        </div>
        <p
          className="tabular-nums"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "1.7rem",
            fontWeight: 500,
            color: "#1A1005",
            flexShrink: 0,
          }}
        >
          {fmt(value)}
        </p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(77,56,0,0.12)",
        borderRadius: 12,
        padding: "8px 14px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        color: "#1A1005",
        boxShadow: "0 4px 16px rgba(77,56,0,0.1)",
      }}
    >
      {fmt(payload[0].value)} entregados
    </div>
  );
}

function BarLabel(props: { x?: number; y?: number; width?: number; height?: number; value?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, value } = props;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2 + 4}
      fill="#4D3800"
      style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500 }}
    >
      {value != null ? fmt(value) : ""}
    </text>
  );
}

function SectionHeader({
  icon,
  iconBg = "#4D3800",
  iconColor = "#D9A441",
  title,
  sub,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1A1005", lineHeight: 1.2 }}>{title}</h2>
        <p style={{ fontSize: "0.78rem", color: "#8A7050", fontWeight: 500, marginTop: 2 }}>{sub}</p>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] p-5 ${className}`}
      style={{ background: "#fff", boxShadow: "0 2px 16px rgba(77,56,0,0.07)" }}
    >
      {children}
    </div>
  );
}

/* ───────── PAGE ───────── */

export default function DashboardPage() {
  const router = useRouter();

  // Bloquea el zoom (pinch y doble toque) en esta página
  useBlockZoom();

  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ───────── SEGURIDAD DE SESIÓN ───────── */

  const logout = useCallback(
    (reason?: "idle") => {
      setLoggingOut(true);

      setTimeout(async () => {
        await fetch("/api/dashboard/logout", { method: "POST" }).catch(() => {});
        router.replace(
          reason === "idle" ? "/dashboard/login?motivo=inactividad" : "/dashboard/login"
        );
      }, 550);
    },
    [router]
  );

  /* ───────── CARGA INICIAL: comercio + campañas ───────── */

  useEffect(() => {
    fetch("/api/dashboard/campaigns")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setCommerce(data.commerce);
        setCampaigns(data.campaigns);

        const active = data.campaigns.find((c: Campaign) => c.active);
        setSelectedCampaign(active?.id || data.campaigns[0]?.id || null);

        setHydrated(true);
      })
      .catch(() => router.replace("/dashboard/login"));
  }, [router]);

  /* ───────── IDLE TIMEOUT ───────── */

  useEffect(() => {
    if (!hydrated) return;

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => logout("idle"), IDLE_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [hydrated, logout]);

  /* ───────── LOAD SESSIONS (por campaña) ───────── */

  useEffect(() => {
    if (!selectedCampaign) return;

    const load = async () => {
      const res = await fetch(`/api/dashboard/sessions?campaignId=${selectedCampaign}`);

      if (!res.ok) return;

      const data = await res.json();
      setSessions(data.sessions);

      const startedAt = consumeNavStart();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

      setTimeout(() => setReady(true), remaining);
    };

    load();
  }, [selectedCampaign]);

  /* ───────── METRICS ───────── */

  const metrics = useMemo(() => {
    const qr = sessions.filter((s) => s.scanned_qr).length;
    const social = sessions.filter((s) => s.clicked_social).length;
    const played = sessions.filter((s) => s.played).length;
    const won = sessions.filter((s) => s.game_status === "WIN").length;
    const lost = sessions.filter((s) => s.game_status === "LOSE").length;
    const claimed = sessions.filter((s) => s.claimed_prize).length;

    return { qr, social, played, won, lost, claimed };
  }, [sessions]);

  const funnelRows = [
    { label: "QR Escaneados", value: metrics.qr, prevValue: undefined as number | undefined },
    { label: "Siguieron Redes", value: metrics.social, prevValue: undefined },
    { label: "Jugaron", value: metrics.played, prevValue: metrics.social },
    { label: "Ganaron", value: metrics.won, prevValue: metrics.played },
    { label: "Reclamaron Premio", value: metrics.claimed, prevValue: metrics.won },
  ];

  const prizeStats = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    const valid = new Set(["small_discount", "medium_discount", "large_discount", "big_discount", "accessory"]);

    sessions.forEach((s) => {
      if (!s.prize_type || !s.prize_title || !valid.has(s.prize_type)) return;

      if (!map[s.prize_type]) map[s.prize_type] = { name: s.prize_title, count: 0 };
      map[s.prize_type].count++;
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [sessions]);

  const maxBar = prizeStats[0]?.count ?? 1;

  const topPrize = useMemo(() => {
    if (prizeStats.length === 0) return null;
    const top = prizeStats[0];
    const total = prizeStats.reduce((acc, p) => acc + p.count, 0) || 1;
    return { name: top.name, count: top.count, pct: Math.round((top.count / total) * 100) };
  }, [prizeStats]);

  const lastUpdate = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

  const currentCampaign = campaigns.find((c) => c.id === selectedCampaign);
  const activeCampaign = campaigns.find((c) => c.active);

  const historicCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => !c.active)
      .sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime())
      .slice(0, 2);
  }, [campaigns]);

  if (!hydrated || !commerce || !ready) {
    return <ChocolateLoader />;
  }

  /* ───────── RENDER ───────── */

  return (
    <>
      <div className="min-h-screen" style={{ background: "#FFFDF7", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20" style={{ isolation: "isolate" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,253,247,0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: "1px solid rgba(77,56,0,0.08)",
              zIndex: 0,
            }}
          />

          <div className="max-w-4xl mx-auto px-4 pt-4 pb-3 relative" style={{ zIndex: 1 }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-15 h-15 rounded-[14px] flex items-center justify-center shrink-0"
                  style={{ background: "#F5EDD8" }}
                >
                  <img
                    src="/images/logoCP.webp"
                    alt="LogoCP"
                    draggable={false}
                    className="w-12 h-12 object-contain select-none"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#D9A441",
                    }}
                  >
                    ChocoPremio
                  </p>
                  <p className="truncate" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4D3800", marginTop: 2 }}>
                    {commerce.name}
                  </p>
                </div>
              </div>

              {/* Selector de campaña — sin overlay oscuro, con animación */}
              {campaigns.length > 0 && (
                <div className="relative" style={{ zIndex: 50 }}>
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-[14px] transition-all active:scale-[0.97]"
                    style={{
                      background: "#4D3800",
                      color: "#FFFDF7",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(77,56,0,0.25)",
                    }}
                  >
                    <Layers size={16} style={{ flexShrink: 0 }} />
                    <span>Campañas</span>
                    <ChevronDown
                      size={16}
                      style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        {/* Capa invisible solo para detectar click-fuera, SIN oscurecer nada */}
                        <div
                          className="fixed inset-0"
                          style={{ zIndex: 40, background: "transparent" }}
                          onClick={() => setMenuOpen(false)}
                        />

                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.18, ease: EASE_OUT }}
                          className="absolute right-0 top-full mt-2 w-72 rounded-[20px] overflow-hidden"
                          style={{
                            background: "#ffffff",
                            boxShadow: "0 16px 50px rgba(77,56,0,0.22)",
                            border: "1px solid rgba(77,56,0,0.08)",
                            zIndex: 100,
                          }}
                        >
                          {activeCampaign && (
                            <div className="p-3.5">
                              <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A7050", marginBottom: 8 }}>
                                Campaña Activa
                              </p>
                              <button
                                onClick={() => {
                                  setSelectedCampaign(activeCampaign.id);
                                  setMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all"
                                style={{
                                  background: selectedCampaign === activeCampaign.id ? "#4D3800" : "#F5EDD8",
                                  color: selectedCampaign === activeCampaign.id ? "#FFFDF7" : "#1A1005",
                                }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#00D11C", flexShrink: 0 }} />
                                  <span className="truncate" style={{ fontSize: "0.92rem", fontWeight: 600 }}>{activeCampaign.name}</span>
                                </div>
                                <span
                                  className="px-2 py-0.5 rounded-full shrink-0"
                                  style={{
                                    background: selectedCampaign === activeCampaign.id ? "#D9A441" : "rgba(77,56,0,0.12)",
                                    color: selectedCampaign === activeCampaign.id ? "#fff" : "#4D3800",
                                    fontSize: "0.6rem",
                                    fontWeight: 800,
                                    letterSpacing: "0.1em",
                                  }}
                                >
                                  ACTIVA
                                </span>
                              </button>
                            </div>
                          )}

                          {historicCampaigns.length > 0 && (
                            <div className="px-3.5 pb-3.5">
                              <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8A7050", marginBottom: 8 }}>
                                Historial
                              </p>
                              <div className="flex flex-col gap-1.5">
                                {historicCampaigns.map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => {
                                      setSelectedCampaign(c.id);
                                      setMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all"
                                    style={{ background: selectedCampaign === c.id ? "#F5EDD8" : "transparent", color: "#1A1005" }}
                                  >
                                    <Clock size={14} style={{ color: "#8A7050", flexShrink: 0 }} />
                                    <span className="truncate" style={{ fontSize: "0.9rem", fontWeight: 500 }}>{c.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {!activeCampaign && historicCampaigns.length === 0 && (
                            <div className="p-4 text-center" style={{ fontSize: "0.85rem", color: "#8A7050", fontWeight: 600 }}>
                              No hay campañas todavía
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Status pill */}
            <div className="mt-3">
              {currentCampaign?.active ? (
                <span
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
                  style={{ background: "rgba(0,168,20,0.1)", fontSize: "0.8rem", fontWeight: 700, color: "#006B0E" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00D11C" }} />
                  Campaña Activa
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
                  style={{ background: "#F0E8D0", fontSize: "0.8rem", fontWeight: 700, color: "#8A7050" }}
                >
                  <Clock size={12} />
                  {currentCampaign ? `Finalizada · ${currentCampaign.name}` : "Sin campaña"}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* ── MAIN ───────────────────────────────────────────────── */}
        <main className="px-4 pb-14 max-w-4xl mx-auto">
          {/* KPIs */}
          <section className="mt-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MetricCard icon={<QrCode size={20} />} value={metrics.qr} label="QR Escaneados" />
              <MetricCard icon={<Share2 size={20} />} value={metrics.social} label="Siguieron Redes" />
              <MetricCard icon={<Gamepad2 size={20} />} value={metrics.played} label="Jugadores" />
              <MetricCard icon={<Trophy size={20} />} value={metrics.won} label="Ganadores" dark />
              <MetricCard icon={<Gift size={20} />} value={metrics.claimed} label="Reclamados" />
            </div>
          </section>

          {/* Funnel */}
          <section className="mt-5">
            <Card>
              <SectionHeader
                icon={<TrendingUp size={18} />}
                title="Embudo de Conversión"
                sub={`Flujo completo de participación · ${currentCampaign?.name || "—"}`}
              />
              {funnelRows.map((row, i) => {
                const pct = row.prevValue != null && row.prevValue > 0 ? Math.round((row.value / row.prevValue) * 100) : null;
                return (
                  <FunnelRow key={row.label} step={i + 1} label={row.label} value={row.value} pct={pct} isLast={i === funnelRows.length - 1} />
                );
              })}
            </Card>
          </section>

          {/* Premios */}
          <section className="mt-5">
            <Card>
              <SectionHeader
                icon={<Package size={18} />}
                iconBg="#F5EDD8"
                iconColor="#4D3800"
                title="Premios Entregados"
                sub="Ordenados de mayor a menor"
              />

              {!ready ? null : prizeStats.length === 0 ? (
                <div className="py-10 text-center" style={{ color: "#8A7050", fontSize: "0.9rem", fontWeight: 600 }}>
                  No hay datos disponibles todavía
                </div>
              ) : (
                <div style={{ height: prizeStats.length * 56 + 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={prizeStats} margin={{ top: 0, right: 60, left: 0, bottom: 0 }} barCategoryGap="30%">
                      <XAxis type="number" hide domain={[0, maxBar * 1.2]} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fill: "#4D3800", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(217,164,65,0.07)" }} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} label={<BarLabel />}>
                        {prizeStats.map((entry) => (
                          <Cell key={entry.name} fill={entry.count === maxBar ? "#D9A441" : "#4D3800"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </section>

          {/* Ganadores / Perdedores */}
          <section className="mt-5">
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-[20px] p-5 flex flex-col gap-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: "linear-gradient(140deg,#194D1E 0%,#0D3311 100%)", boxShadow: "0 6px 28px rgba(0,168,20,0.2)" }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} style={{ color: "#00D11C" }} />
                  <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                    Ganaron
                  </p>
                </div>
                <p className="tabular-nums" style={{ fontFamily: "'DM Mono', monospace", fontSize: "2.9rem", fontWeight: 500, color: "#00D11C", lineHeight: 1 }}>
                  {fmt(metrics.won)}
                </p>
              </div>

              <div
                className="rounded-[20px] p-5 flex flex-col gap-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]"
                style={{ background: "linear-gradient(140deg,#3D1800 0%,#251000 100%)", boxShadow: "0 6px 28px rgba(77,56,0,0.25)" }}
              >
                <div className="flex items-center gap-2">
                  <XCircle size={18} style={{ color: "#D9A441" }} />
                  <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                    Perdieron
                  </p>
                </div>
                <p className="tabular-nums" style={{ fontFamily: "'DM Mono', monospace", fontSize: "2.9rem", fontWeight: 500, color: "#D9A441", lineHeight: 1 }}>
                  {fmt(metrics.lost)}
                </p>
              </div>
            </div>
          </section>

          {/* Top Prize */}
          <section className="mt-5">
            <div
              className="rounded-[20px] p-6 relative overflow-hidden"
              style={{ background: "linear-gradient(140deg,#4D3800 0%,#2E2000 50%,#1A1200 100%)", boxShadow: "0 10px 40px rgba(77,56,0,0.3)" }}
            >
              <div
                className="absolute pointer-events-none"
                style={{ width: 240, height: 240, background: "radial-gradient(circle, #D9A441 0%, transparent 70%)", opacity: 0.12, top: -80, right: -60, borderRadius: "50%" }}
              />
              <div
                className="absolute pointer-events-none"
                style={{ width: 120, height: 120, background: "radial-gradient(circle, #D9A441 0%, transparent 70%)", opacity: 0.08, bottom: -30, left: 30, borderRadius: "50%" }}
              />

              <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(217,164,65,0.2)" }}>
                    <Star size={17} fill="#D9A441" style={{ color: "#D9A441" }} />
                  </div>
                  <p style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#D9A441" }}>
                    Premio Más Ganado
                  </p>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 style={{ fontSize: "clamp(1.35rem, 4.5vw, 2rem)", fontWeight: 800, color: "#FFFDF7", lineHeight: 1.15 }}>
                      {topPrize?.name || "—"}
                    </h3>
                    <p style={{ fontSize: "0.88rem", color: "rgba(255,253,247,0.5)", fontWeight: 500, marginTop: 6 }}>
                      {fmt(topPrize?.count || 0)} entregados
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="tabular-nums" style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(2.2rem, 7.5vw, 3.5rem)", fontWeight: 500, color: "#D9A441", lineHeight: 1 }}>
                      {topPrize?.pct ?? 0}%
                    </p>
                    <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(217,164,65,0.6)", textTransform: "uppercase" }}>
                      del total
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="rounded-full overflow-hidden" style={{ height: 7, background: "rgba(255,255,255,0.1)" }}>
                    <div
                      style={{
                        width: `${topPrize?.pct ?? 0}%`,
                        height: "100%",
                        background: "linear-gradient(to right, #D9A441, #F5C870)",
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.25)" }}>0%</span>
                    <span style={{ fontSize: "0.66rem", color: "rgba(217,164,65,0.5)" }}>{topPrize?.pct ?? 0}%</span>
                    <span style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.25)" }}>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Info + actualización */}
          <footer className="mt-8">
            <div className="rounded-[18px] px-5 py-4" style={{ background: "#F5EDD8", border: "1px solid rgba(77,56,0,0.06)" }}>
              <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} style={{ color: "#8A7050" }} />
                  <p style={{ fontSize: "0.8rem", color: "#8A7050", fontWeight: 500 }}>
                    Sesión protegida · se cierra sola tras 15 min de inactividad
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={13} style={{ color: "#8A7050" }} />
                  <p style={{ fontSize: "0.78rem", color: "#8A7050" }}>{lastUpdate}</p>
                </div>
              </div>
            </div>
          </footer>

          {/* ── SESIÓN / CERRAR SESIÓN ── */}
          <section className="mt-4">
            <div
              className="rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              style={{ background: "#fff", boxShadow: "0 2px 16px rgba(77,56,0,0.07)", border: "1px solid rgba(77,56,0,0.06)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F5EDD8" }}>
                  <img
                    src="/images/logoCP.webp"
                    alt="LogoCP"
                    draggable={false}
                    className="w-10 h-10 object-contain select-none"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1A1005" }}>
                    {commerce.name}
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "#8A7050", fontWeight: 500 }}>Sesión de comercio</p>
                </div>
              </div>

              <button
                onClick={() => logout()}
                disabled={loggingOut}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-[14px] transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(140deg,#3D1800 0%,#251000 100%)",
                  color: "#F5C870",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  boxShadow: "0 6px 20px rgba(77,56,0,0.25)",
                  opacity: loggingOut ? 0.7 : 1,
                  cursor: loggingOut ? "wait" : "pointer",
                }}
              >
                <LogOut size={18} />
                {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
