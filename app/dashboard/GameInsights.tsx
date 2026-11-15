import { CalendarDays, Gift } from "lucide-react";
import GiftArt, { BOXES } from "../components/ui/GiftArt";
import type { BoxStat, DailyActivity } from "@/lib/dashboard/types";
import styles from "./GameInsights.module.css";

const fmt = new Intl.NumberFormat("es-CO");
const compact = new Intl.NumberFormat("es-CO", { notation:"compact", maximumFractionDigits:0 });
const dateFormat = new Intl.DateTimeFormat("es-CO", { day:"numeric", month:"short", timeZone:"America/Bogota" });
const labelDate = (date:string) => dateFormat.format(new Date(date + "T12:00:00-05:00"));

export function FavoriteBoxes({ stats }: { stats: BoxStat[] }) {
  const total = stats.reduce((sum,item) => sum + item.count,0);
  const max = Math.max(0,...stats.map(item => item.count));
  const tied = stats.filter(item => item.count === max).length > 1;
  return <section className={styles.card} aria-labelledby="boxes-heading">
    <h2 id="boxes-heading" className={styles.heading}><Gift size={20} /> Cajas más elegidas</h2>
    <p className={styles.copy}>Preferencias por color entre las cajas abiertas.</p>
    <div className={styles.boxes}>{BOXES.map((box,index) => {
      const count = stats.find(item => item.box === index + 1)?.count ?? 0;
      const favorite = max > 0 && count === max;
      return <div key={box.color} className={`${styles.box} ${favorite ? styles.favorite : ""}`}>
        <div className={styles.art}><GiftArt color={box.color} /></div>
        <h3 className={styles.name}>{box.name}</h3>
        <strong className={styles.count}>{fmt.format(count)}</strong>
        <span className={styles.percent}>{total ? Math.round(count / total * 100) : 0}% de elecciones</span>
        <span className={styles.badge}>{favorite ? tied ? "Empate en primer lugar" : "La más elegida" : "\u00a0"}</span>
      </div>;
    })}</div>
    <p className={styles.copy}>{total ? `${fmt.format(total)} elecciones registradas. El color no determina el premio.` : "Todavía no hay elecciones de cajas registradas."}</p>
  </section>;
}

export function DailyGameActivity({ days }: { days:DailyActivity[] }) {
  const total = days.reduce((sum,day) => sum + day.count,0);
  const max = Math.max(1,...days.map(day => day.count));
  return <section className={styles.card} aria-labelledby="activity-heading">
    <h2 id="activity-heading" className={styles.heading}><CalendarDays size={20} /> Actividad diaria</h2>
    <p className={styles.copy}>Participaciones iniciadas por día · hora de Colombia.</p>
    {total > 0 ? <>
      <p className={styles.summary}><strong>{fmt.format(total)}</strong><span>participaciones en estos 14 días</span></p>
      <ol className={styles.days}>{days.map(day => <li key={day.date} className={styles.day} title={`${labelDate(day.date)}: ${fmt.format(day.count)} participaciones`}>
        <span className={styles.accessible}>{labelDate(day.date)}: {fmt.format(day.count)} participaciones</span>
        <div className={styles.plot} aria-hidden="true"><span className={styles.value}>{day.count ? compact.format(day.count) : ""}</span><span className={styles.bar} style={{ height:day.count / max * 110 }} /></div>
        <span className={styles.date} aria-hidden="true">{Number(day.date.slice(-2))}</span>
      </li>)}</ol>
      <div className={styles.range}><span>{labelDate(days[0].date)}</span><span>{labelDate(days[days.length-1].date)}</span></div>
    </> : <p className={styles.empty}>Todavía no hay participaciones en este período.</p>}
  </section>;
}
