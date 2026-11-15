import styles from "./DashboardLoading.module.css";

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Cargando estadísticas" className={styles.loading}>
      <span className={styles.spinner} aria-hidden="true" />
    </div>
  );
}
