import { BrandBackground } from "../components/ui/Brand";
import DashboardLoading from "./DashboardLoading";

export default function DashboardSkeleton() {
  return <>
    <BrandBackground className="fixed inset-0 z-0 pointer-events-none" />
    <DashboardLoading />
  </>;
}
