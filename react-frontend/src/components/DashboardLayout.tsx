// Proxy — mada-booking imports as default, wraps in pixel-rise layout with proper padding.
// - /mada-booking/vue-site/{siteId}/... → DashboardLayout (site sidebar)
// - /mada-booking/dashboard/...         → WorkspaceLayout (workspace sidebar)
import React from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout as PixelRiseLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isSiteContext = location.pathname.includes("/mada-booking/vue-site/");

  if (isSiteContext) {
    return (
      <PixelRiseLayout>
        <div className="p-6">{children}</div>
      </PixelRiseLayout>
    );
  }

  // Global workspace context (/mada-booking/dashboard/...)
  return (
    <WorkspaceLayout>
      <div className="p-6">{children}</div>
    </WorkspaceLayout>
  );
}
