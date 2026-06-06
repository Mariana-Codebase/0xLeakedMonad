import dynamic from "next/dynamic";
import PlatformLoading from "./loading";

const LeakedDashboard = dynamic(
  () => import("../../components/dashboard/ChainWatchDashboard").then((m) => m.LeakedDashboard),
  { loading: () => <PlatformLoading />, ssr: false }
);

export default function PlatformPage() {
  return <LeakedDashboard initialModule="home" />;
}
