import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/security/session";
import { getDashboardBootstrap } from "@/lib/server/dashboard";
import { HttpError } from "@/lib/server/http";
import Dashboard from "./Dashboard";

export default async function DashboardPage() {
  // Client navigation uses the complete handoff already returned by login.
  // A document reload prepares fresh data before sending the dashboard HTML.
  if ((await headers()).get("rsc") === "1") return <Dashboard />;

  const session = await verifySessionToken((await cookies()).get("dashboard_session")?.value);
  if (!session) redirect("/dashboard/login");

  let initialData;
  try {
    initialData = await getDashboardBootstrap(session.commerceId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/dashboard/login");
    return <Dashboard initialError="No se pudo cargar el panel. Intenta de nuevo." />;
  }
  return <Dashboard initialData={initialData} />;
}
