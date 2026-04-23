
import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MonActualiteContent } from "@/components/news-feed/MonActualiteContent";

const MonActualite = () => {
  return (
    <SidebarProvider>
      <DashboardLayout>
        <MonActualiteContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default MonActualite;
