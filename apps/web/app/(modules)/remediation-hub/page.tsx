"use client";

import dynamic from "next/dynamic";

const LeakedDashboard = dynamic(
  () => import("../../../components/dashboard/ChainWatchDashboard").then((m) => m.LeakedDashboard),
  { ssr: false }
);

export default function RemediationHubPage() {
  return <LeakedDashboard initialModule="remediation-hub" />;
}
