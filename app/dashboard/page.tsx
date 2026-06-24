"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ChocolateLoader from "@/app/components/ChocolateLoader";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Share2,
  Gamepad2,
  Trophy,
  Gift,
  CheckCircle2,
  XCircle,
  Star,
  Calendar,
  Menu,
  X,
} from "lucide-react";

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

/* ───────── PAGE ───────── */

export default function DashboardPage() {
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ───────── LOAD ───────── */

  // Cargar comercio desde sessionStorage

  useEffect(() => {
    const stored = sessionStorage.getItem("dashboard_commerce");
    if (stored) setCommerce(JSON.parse(stored));
    setHydrated(true);
  }, []);

  // Cargar campañas cada vez que cambia el comercio

  useEffect(() => {
    if (!commerce?.id) return;

    const load = async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("commerce_id", commerce.id);

      const safe = (data || []) as Campaign[];
      setCampaigns(safe);

      const active = safe.find((c) => c.active);
      setSelectedCampaign(active?.id || safe[0]?.id || null);
    };

    load();
  }, [commerce]);

  // Cargar sesiones cada vez que cambia la campaña

  useEffect(() => {
  if (!commerce?.id || !selectedCampaign) return;

  const load = async () => {
    setLoading(true);

    const pageSize = 1000;
    let from = 0;
    let all: GameSession[] = [];

    while (true) {
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("commerce_id", commerce.id)
        .eq("campaign_id", selectedCampaign)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("SUPABASE ERROR:", error);
        break;
      }

      if (!data || data.length === 0) break;

      all = [...all, ...(data as GameSession[])];

      if (data.length < pageSize) break;

      from += pageSize;
    }

    console.log("TOTAL SESIONES CARGADAS:", all.length);

    setSessions(all);
    setLoading(false);
  };

  load();
}, [commerce, selectedCampaign]);

  // Detectar tamaño de pantalla para responsive

  useEffect(() => {
  const updateSize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  updateSize();

  window.addEventListener("resize", updateSize);

  return () => window.removeEventListener("resize", updateSize);
}, []);

  /* ───────── METRICS ───────── */

  const metrics = useMemo(() => {
  const qr = sessions.filter((s) => s.scanned_qr).length;
  const social = sessions.filter((s) => s.clicked_social).length;
  const played = sessions.filter((s) => s.played).length;

  const won = sessions.filter((s) => s.game_status === "WIN").length;
  const lost = sessions.filter((s) => s.game_status === "LOSE").length;
  const retry = sessions.filter((s) => s.game_status === "RETRY").length;

  const claimed = sessions.filter((s) => s.claimed_prize).length;

  return { qr, social, played, won, lost, retry, claimed };
}, [sessions]);

// Datos para el funnel de conversión

  const funnel = [
    { label: "QR Escaneados", value: metrics.qr },
    { label: "Nuevos Seguidores", value: metrics.social },
    { label: "Jugadas", value: metrics.played },
    { label: "Ganadores", value: metrics.won },
    { label: "Premios Reclamados", value: metrics.claimed },
  ];

// Estadísticas de premios

const prizeStats = useMemo(() => {
  const map: Record<
    string,
    {
      title: string;
      value: number;
    }
  > = {};

  sessions.forEach((s) => {
    if (!s.prize_type || !s.prize_title) return;

    // Solo mostrar los premios reales
    if (
      ![
        "small_discount",
        "medium_discount",
        "large_discount",
        "big_discount",
        "accessory",
      ].includes(s.prize_type)
    ) {
      return;
    }

    if (!map[s.prize_type]) {
      map[s.prize_type] = {
        title: s.prize_title, // Nombre personalizado del comercio
        value: 0,
      };
    }

    map[s.prize_type].value++;
  });

  return Object.values(map).sort((a, b) => b.value - a.value);
}, [sessions]);

// Obtener el premio más común

  const topPrize = useMemo(() => {
  const validPrizeTypes = new Set([
    "small_discount",
    "medium_discount",
    "large_discount",
    "big_discount",
    "accessory",
  ]);

  const map = sessions.reduce<Record<string, number>>((acc, s) => {
    // 🚫 ignorar no-premios
    if (!s.prize_type || !validPrizeTypes.has(s.prize_type)) return acc;

    const key = s.prize_title || "Sin premio";
    acc[key] = (acc[key] || 0) + 1;

    return acc;
  }, {});

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);

  return sorted[0] || null;
}, [sessions]);

// Formatear fecha de última actualización

  const lastUpdate = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date());

  /* ───────── CAMPAÑAS ACTIVAS E HISTÓRICAS ───────── */

  const currentCampaign = campaigns.find(
  (campaign) => campaign.id === selectedCampaign
);

const activeCampaign = campaigns.find(
  (campaign) => campaign.active
);

const historyCampaigns = useMemo(() => {
  return campaigns
    .filter((campaign) => campaign.active === false)
    .sort(
      (a, b) =>
        new Date(b.created_at ?? "").getTime() -
        new Date(a.created_at ?? "").getTime()
    )
    .slice(0, 2);
}, [campaigns]);

if (!hydrated || loading) return <ChocolateLoader />;
if (!commerce) return <div>No hay comercio activo</div>;

  /* ───────── RENDER ───────── */

  return (
    <main style={styles.main}>
      <div style={styles.container}>

        {/* HEADER */}
<section style={styles.headerCard}>
  <div style={styles.headerTop}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={styles.logo}>🍫</div>

      <div>
        <h1 style={styles.brandTitle}>
          ChocoPremio
        </h1>

        <p style={styles.brandSub}>
          Dashboard de campañas
        </p>
      </div>
    </div>
  </div>

  <div style={styles.headerInfo}>

    <div
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
    padding: "12px 20px",
    borderRadius: 999,
    background: currentCampaign?.active
      ? "linear-gradient(135deg,#0F8A42,#22C55E)"
      : "linear-gradient(135deg,#4B5563,#1F2937)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: ".6px",
    textTransform: "uppercase",
    boxShadow: currentCampaign?.active
      ? "0 10px 28px rgba(34,197,94,.35)"
      : "0 10px 28px rgba(31,41,55,.35)",
    border: currentCampaign?.active
      ? "1px solid rgba(255,255,255,.18)"
      : "1px solid rgba(255,255,255,.08)",
  }}
>
  <div
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "#fff",
      boxShadow: currentCampaign?.active
        ? "0 0 12px rgba(255,255,255,.9)"
        : "0 0 8px rgba(255,255,255,.45)",
    }}
  />

  <div
    style={{
      display: "flex",
      flexDirection: "column",
      lineHeight: 1.1,
    }}
  >
    <span
      style={{
        fontSize: 10,
        fontWeight: 900,
      }}
    >
      {currentCampaign?.active
        ? "ACTIVA"
        : "FINALIZADA"}
    </span>
  </div>
</div>

    <h2
      style={{
        ...styles.commerceName,
        marginBottom: 8,
      }}
    >
      {commerce.name}
    </h2>

    <h3
      style={{
        ...styles.campaignName,
        marginBottom: 24,
      }}
    >
      {currentCampaign?.name || "Sin campaña"}
    </h3>

    {historyCampaigns.length > 0 && (
      <button
        onClick={() => setShowHistory(true)}
        style={{
          width: "100%",
          maxWidth: 220,
          margin: "0 auto",
          padding: "15px 20px",
          border: "none",
          borderRadius: 30,
          background: "#4d3800",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          transition: ".25s",
        }}
      >
        Historial de campañas
      </button>
    )}
  </div>

  {showHistory && (
  <div style={styles.historyOverlay}>
    <div style={styles.historyModal}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          Seleccionar campaña
        </h3>

        <button
          onClick={() => setShowHistory(false)}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 24,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* CAMPAÑA ACTIVA */}

      {activeCampaign && (
        <>
          <h4
            style={{
              margin: "0 0 12px 0",
              color: "#16A34A",
              fontWeight: 800,
            }}
          >
            Campaña Activa
          </h4>

          <button
            onClick={() => {
              setSelectedCampaign(activeCampaign.id);
              setShowHistory(false);
            }}
            style={{
              ...styles.historyItemActive,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {activeCampaign.name}
            </div>
          </button>
        </>
      )}

      {/* HISTORIAL */}

      {historyCampaigns.length > 0 && (
        <>
          <h4
            style={{
              margin: "0 0 13px 0",
              color: "#4d3800",
              fontWeight: 800,
            }}
          >
            Historial
          </h4>

          {historyCampaigns.map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => {
                setSelectedCampaign(campaign.id);
                setShowHistory(false);
              }}
              style={styles.historyItem}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 6,
                }}
              >
                {campaign.name}
              </div>

              <div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  </div>
)}

</section>

        {/* KPI */}

<section
  style={{
    ...styles.grid,
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fit, minmax(190px, 1fr))",
  }}
>
  {[
    { t: "QR Escaneados", v: metrics.qr, i: QrCode },
    { t: "Seguidores", v: metrics.social, i: Share2 },
    { t: "Jugadas", v: metrics.played, i: Gamepad2 },
    { t: "Ganadores", v: metrics.won, i: Trophy },
    { t: "Reclamados", v: metrics.claimed, i: Gift },
  ].map((c, i) => {
    const Icon = c.i;

    return (
      <div key={i} style={styles.kpi}>
          <div style={styles.iconBox}>
            <Icon size={30} />
          </div>

          <div style={styles.kpiValue}>
            {c.v}
        </div>

        <div style={styles.kpiLabel}>
          {c.t}
        </div>
      </div>
    );
  })}
</section>

        {/* FUNNEL */}
       
<section style={styles.card}>
  <h3 style={{ marginBottom: 18, fontSize: 20, fontWeight: 900, color: "#4d3800" }}>
    Embudo de Conversión
  </h3>

  <p style={{ marginBottom: 22, fontWeight: 700, color: "#000" }}>
    Analiza cómo avanzan tus clientes
  </p>

  {/* WRAPPER GENERAL */}
  <div style={{ position: "relative" }}>

    {/* LÍNEA VERTICAL PERFECTAMENTE CENTRADA */}
    <div
      style={{
        position: "absolute",
        top: 24,
        bottom: 24,
        left: 24, // mitad del círculo (48px / 2)
        width: 2,
        transform: "translateX(-50%)",
        background:
          "linear-gradient(to bottom, #5C3317, #8B5A2B, #A97449, #16A34A)",
        opacity: 0.25,
        borderRadius: 999,
        zIndex: 0,
      }}
    />

    {funnel.map((f, i) => {
  const prevValue = funnel[i - 1]?.value || 0;

  const pct =
    i === 0
      ? 100
      : prevValue === 0
        ? 0
        : Math.round((f.value / prevValue) * 100);

  const colors = [
    "#5C3317",
    "#8B5A2B",
    "#A97449",
    "#16A34A",
    "#D97706",
  ];

  const barWidth =
  i === 0
    ? (f.value > 0 ? 100 : 0)
    : pct;

  return (
    <div
      key={i}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: i === funnel.length - 1 ? 0 : 5,
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* PASO */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: colors[i] || "#5C3317",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 900,
          fontSize: 16,
          boxShadow: "0 10px 25px rgba(0,0,0,.15)",
          flexShrink: 0,
        }}
      >
        {i + 1}
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1 }}>

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <b style={{ fontSize: 15 }}>{f.label}</b>

          <span style={{ fontSize: 20, fontWeight: 900, color: "#2A1408" }}>
            {f.value}
          </span>
        </div>

        {/* BAR */}
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "#fff",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: "#4d3800",
              borderRadius: 999,
              transition: "width .6s ease",
            }}
          />
        </div>

        {/* % PRO */}
        <div
          style={{
            marginTop: 8,
            minHeight: 24,
            display: "flex",
            alignItems: "center",
          }}
        >
          {i === 0 || prevValue === 0 || f.value === 0 ? null : (
            <>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#16A34A",
                  boxShadow: "0 0 8px rgba(22,163,74,.6)",
                  marginRight: 8,
                }}
              />

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#16A34A",
                  background: "rgba(22,163,74,.10)",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {pct}% del paso anterior
              </span>
            </>
          )}
        </div>

      </div>
    </div>
  );
})}
  </div>
</section>

{/* ==================== ESTADÍSTICAS DE PREMIOS ==================== */}

<section
  style={{
    ...styles.card,
    background: "#fff",
    minHeight: 470,
    display: "flex",
    flexDirection: "column",
  }}
>
  {/* Encabezado */}

  <div style={{ marginBottom: 30 }}>
    <h3
      style={{
        margin: 0,
        fontSize: 20,
        fontWeight: 900,
        color: "#4d3800",
      }}
    >
      Premios Entregados
    </h3>

    <p
      style={{
        marginTop: 18,
        marginBottom: 0,
        color: "#000",
        fontSize: 15,
        fontWeight: 700,
      }}
    >
      Revisa los premios más populares entre tus clientes
    </p>
  </div>

  {prizeStats.length === 0 ? (
    <div
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#000",
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      No hay datos disponibles
    </div>
  ) : (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {prizeStats.map((item, index) => {
        const max = prizeStats[0]?.value || 1;
        const percent = (item.value / max) * 100;

        return (
          <div
            key={item.title}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              alignItems: "center",
              gap: 20,
              minHeight: 58,
              borderBottom:
                index !== prizeStats.length - 1
                  ? "1px solid #fff"
                  : "none",
            }}
          >
            {/* Nombre */}

            <div
              style={{
                fontWeight: 700,
                color: "#000",
                fontSize: 12,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title}
            </div>

            {/* Barra */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 12,
                  background: "#fff",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    background: "#4d3800",
                  }}
                />
              </div>

              <div
                style={{
                  width: 42,
                  textAlign: "right",
                  fontWeight: 900,
                  fontSize: 20,
                  color: "#000",
                }}
              >
                {item.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>

        {/* STATS GANADORES Y PERDEDORES */}
<section style={styles.winnersGrid}>
  
  <div style={styles.winnerCard}>
    <div style={styles.iconBox}>
      <CheckCircle2 size={28} />
    </div>

    <div style={styles.winnerNumber}>
      {metrics.won}
    </div>

    <div style={styles.winnerText}>
      Ganadores
    </div>
  </div>

  <div style={styles.losersCard}>
    
    <div style={styles.iconBox}>
      <XCircle size={28} />
    </div>

    <div style={styles.winnerNumber}>
      {metrics.lost}
    </div>

    <div style={styles.winnerText}>
      Perdedores
    </div>
  </div>

</section>

        {/* TOP PRIZE */}
<section style={styles.topPrizeCard}>

  <div style={styles.iconBox}>
    <Star size={26} />
  </div>

  <h2 style={styles.topPrizeTitle}>
    Top Premio
  </h2>

  <h1 style={styles.topPrizeName}>
    {topPrize?.[0] || "—"}
  </h1>

</section>

<div
  style={{
    marginTop: 20,
    textAlign: "center",
    color: "#4d3800",
    fontSize: 13,
    fontWeight: 600,
  }}
>
  Última actualización:
  <span
    style={{
      color: "#4d3800",
      fontWeight: 800,
      marginLeft: 6,
    }}
  >
    {lastUpdate}
  </span>
</div>

      </div>
    </main>
  );
}

/* ───────── DESIGN ───────── */

  const styles: Record<string, React.CSSProperties> = {
  main: {
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",

  background: "radial-gradient(circle at top,#fffdf6 0%,#fff6e4 35%,#fdeccf 60%,#f6ddb1 100%)",

  backgroundAttachment: "fixed",

  fontFamily:
    "Inter,system-ui,-apple-system,BlinkMacSystemFont,sans-serif",

  color: "#2A1408",
},

  container: {
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },

  card: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    borderRadius: 24,
    padding: 28,
    border: "1px solid rgba(184,115,51,.15)",
    boxShadow: "0 12px 35px rgba(42,20,8,.08)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },

  /* HEADER */

  headerCard: {
    background: "#fff",
    borderRadius: 30,
    padding: 32,
    color: "#FFFFFF",
    boxShadow:
      "0 25px 60px rgba(42,20,8,.25)",
    overflow: "hidden",
  },

  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    background:"#4d3800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    boxShadow:
      "0 18px 35px rgba(42,20,8,.35)",
  },

  brandTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.1,
    color: "#4d3800",
  },

  brandSub: {
    margin: "8px 0 0",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "#000",
  },

  statusBadge: {
    background: "#efe4d2",
    padding: "10px 16px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    backdropFilter: "blur(10px)",
    color: "#000",
  },

  headerInfo: {
    marginTop: 20,
  },

  commerceName: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
    lineHeight: 1.1,
    color: "#4d3800",
  },

  campaignName: {
    fontSize: 15,
    fontWeight: 700,
    opacity: 0.95,
    color: "#000",
  },

  campaignStatus: {
    margin: "12px 0 0",
    fontSize: 15,
    opacity: 0.75,
  },

  /* GRID */

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: 18,
  },

  // KPI 

  kpi: {
    background: "#fff",
    borderRadius: 24,
    padding: 22,
    border: "1px solid rgba(184,115,51,.15)",
    boxShadow:
      "0 8px 25px rgba(42,20,8,.06)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },

  kpiTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  iconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    background: "#4d3800",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 6px 16px rgba(184,115,51,.25)",
  },

  kpiValue: {
    fontSize: 30,
    fontWeight: 900,
    lineHeight: 1,
    color: "#000",
  },

  kpiLabel: {
    fontSize: 15,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#4d3800",
  },

  /* FUNNEL */

  bar: {
    height: 12,
    borderRadius: 999,
    background: "#fff",
    overflow: "hidden",
    marginTop: 8,
  },

  fill: {
    height: "100%",
    background:
      "linear-gradient(90deg,#5C3317,#B87333,#E8C36A)",
    borderRadius: 999,
    boxShadow:
      "0 0 10px rgba(184,115,51,.35)",
  },

  /* WINNERS & LOSERS */

  winnersGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 18,
},

winnerCard: {
  background: "#fff",
  borderRadius: 24,
  padding: 28,
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
},

losersCard: {
  background: "#fff",
  borderRadius: 24,
  padding: 28,
  textAlign: "center",
  
  boxShadow: "0 12px 30px rgba(0,0,0,.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
},

winnerNumber: {
  fontSize: 30,
  fontWeight: 900,
  color: "#000",
  lineHeight: 1,
  marginTop: 10,
  marginBottom: 6,
},

winnerText: {
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "#4d3800",
},

  /* TOP PRIZE */

 topPrizeCard: {
  background: "linear-gradient(180deg, #ffffff 0%, #fff9e6 10%, #ffe9a3 25%, #ffd54f 45%, #ffca28 65%, #f4b400 85%, #d89c00 100%)",
  borderRadius: 26,
  padding: 34,
  textAlign: "center",
  boxShadow: "0 15px 35px rgba(0,0,0,.10)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
},

topPrizeTitle: {
  margin: 10,
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "#4d3800",
  marginBottom: 10,
},

topPrizeName: {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
  color: "#000",
  lineHeight: 1.2,
  marginBottom: 14,
},

  // HISTORIAL DE CAMPAÑAS

  historyOverlay: {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.55)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
  zIndex: 9999,
},

historyModal: {
  width: "85%",
  maxWidth: 390,
  background: "#fffaf3",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.25)",
  border: "1px solid #efe4d2",
  color: "#4d3800",
},

historyHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  paddingBottom: 12,
  borderBottom: "2px solid #efe4d2",
},

closeButton: {
  width: 38,
  height: 38,
  borderRadius: "50%",
  border: "none",
  background: "#e8d8bc",
  color: "#4d3800",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
},

activeCampaignCard: {
  background: "#fff4c7",
  border: "2px dashed #d9b100",
  borderRadius: 18,
  padding: 18,
  marginBottom: 18,
  color: "#4d3800",
},

historySection: {
  background: "#f7f3ed",
  borderRadius: 16,
  padding: 14,
},

sectionTitle: {
  fontSize: 13,
  fontWeight: 800,
  color: "#4d3800",
  marginBottom: 12,
  textTransform: "uppercase",
  letterSpacing: ".5px",
},

historyItem: {
  width: "100%",
  padding: 16,
  marginBottom: 12,
  borderRadius: 16,
  background: "#d9c7a7", //
  color: "#4d3800", //
  cursor: "pointer",
  textAlign: "left",
  transition: "all .25s ease",
  boxShadow: "0 8px 20px rgba(77,56,0,.08)",
},

historyItemActive: {
  width: "100%",
  padding: 16,
  marginBottom: 12,
  borderRadius: 16,
  background: "#4d3800", //
  color: "#fff",
  cursor: "pointer",
  textAlign: "left",
  transition: "all .25s ease",
  boxShadow: "0 8px 20px rgba(77,56,0,.15)",
},
};