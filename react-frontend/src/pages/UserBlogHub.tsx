// src/pages/UserBlogHub.tsx - PAGE DES AUTEURS
import React from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AuthorsList } from "@/components/user-blogs/AuthorsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";

const UserBlogHubContent = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/mon-actualite")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Auteurs</h1>
              <p className="text-sm text-muted-foreground">
                Découvrez tous les auteurs de la plateforme
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des auteurs */}
      <AuthorsList />
    </div>
  );
};

const UserBlogHub = () => {
  return (
    <SidebarProvider>
      <DashboardLayout>
        <UserBlogHubContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default UserBlogHub;
