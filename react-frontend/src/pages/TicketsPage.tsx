import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { toast } from "@/components/ui/use-toast";
import TicketsContent from "@/components/tickets/TicketsContent";

const TicketsPage = () => {
  const location = useLocation();
  const isFromWorkspace = new URLSearchParams(location.search).get('from') === 'workspace';

  useEffect(() => {
    const shouldShowNotif = Math.random() > 0.7;

    if (shouldShowNotif) {
      setTimeout(() => {
        const notifications = [
          {
            title: "Mise à jour du système de tickets",
            description: "De nouvelles fonctionnalités ont été ajoutées au système de tickets.",
          },
          {
            title: "Ticket en attente depuis longtemps",
            description: "Vous avez un ticket qui n'a pas été mis à jour depuis plus de 3 jours.",
          },
          {
            title: "Nouvelle politique de support",
            description: "Notre équipe de support répond désormais dans les 24 heures.",
          },
        ];

        const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];

        toast({
          title: randomNotif.title,
          description: randomNotif.description,
        });
      }, 3000);
    }
  }, []);

  if (isFromWorkspace) {
    return (
      <WorkspaceLayout>
        <TicketsContent />
      </WorkspaceLayout>
    );
  }

  return (
    <SidebarProvider>
      <DashboardLayout>
        <TicketsContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default TicketsPage;
