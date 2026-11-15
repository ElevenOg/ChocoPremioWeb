export interface Commerce { id: string; name: string }
export interface Campaign { id: string; name: string; active: boolean; created_at?: string }
export interface Metrics { qr: number; social: number; played: number; opened: number; abandoned: number; claimed: number }
export interface PrizeStat { name: string; count: number }
export interface BoxStat { box: number; count: number }
export interface DailyActivity { date: string; count: number }
export interface DashboardStats { metrics: Metrics; prizeStats: PrizeStat[]; boxStats: BoxStat[]; dailyActivity: DailyActivity[]; timeZone: string }
export interface DashboardBootstrap {
  commerce: Commerce;
  campaigns: Campaign[];
  campaignId: string | null;
  stats: DashboardStats;
  updatedAt: string;
}
export function emptyDashboardStats(): DashboardStats {
  return { metrics: { qr:0, social:0, played:0, opened:0, abandoned:0, claimed:0 }, prizeStats:[], boxStats:[1,2,3,4].map(box => ({ box,count:0 })), dailyActivity:[], timeZone:"America/Bogota" };
}
export interface SessionStatsRow {
  scanned_qr: boolean;
  clicked_social: boolean;
  played: boolean;
  claimed_prize: boolean;
  game_status: string;
  prize_title: string | null;
  prize_type: string | null;
}

