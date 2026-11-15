import type { DashboardBootstrap } from "../dashboard/types";

// Short-lived handoff after login, never persisted in browser storage.
let handoff: { data: DashboardBootstrap; expires: number } | null = null;

export function clearDashboardBootstrap() { handoff = null; }
export function peekDashboardBootstrap() {
  return handoff && handoff.expires > Date.now() ? handoff.data : null;
}
export function setDashboardBootstrap(data: DashboardBootstrap) {
  handoff = { data, expires: Date.now() + 30000 };
}
