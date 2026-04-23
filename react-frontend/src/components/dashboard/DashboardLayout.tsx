// src/components/layouts/DashboardLayout.tsx
import React, { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarContent } from "./SidebarContent";
import {
  Menu,
  User,
  CreditCard,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import NotificationBell from "@/components/ui/notification-bell";
import ExpirationDropdown from "@/components/ui/expiration-dropdown";
import LogoutConfirmButton from "@/components/auth/LogoutConfirmButton";
import { WorkspaceSuspendedBanner } from "@/components/workspace/WorkspaceSuspendedBanner";
import { SiteHeaderContext } from "@/components/dashboard/SiteHeaderContext";


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const isMobile = useIsMobile();
  const { user, getAvatarUrl } = useAuth();

  // ✅ SYNCHRONISATION : Utiliser getAvatarUrl du contexte
  const avatarUrl = getAvatarUrl(user?.avatar);

  // ✅ GESTION DU SCROLL AVEC EFFET GLASSMORPHISM
  useEffect(() => {
    const handleScroll = (): void => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex min-w-full">
        {/* ✅ SIDEBAR FIXE */}
        <Sidebar className="border-r">
          <SidebarHeader />
          <SidebarContent />
        </Sidebar>

        {/* ✅ STRUCTURE PRINCIPALE - Flex Column pour organiser Header, Content, Footer */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          {/* ✅ HEADER PREMIUM STYLE NAVBAR */}
          <header
            className={cn(
              "h-18 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 transition-all duration-300 sticky top-0 z-50",
              "bg-white/80 backdrop-blur-md border-white/20",
              isScrolled &&
                "bg-white/95 shadow-lg shadow-black/5 border-slate-200/50"
            )}
          >
            {/* ✅ SECTION GAUCHE: SidebarTrigger + Site context */}
            <div className="flex items-center gap-3">
              <SidebarTrigger>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SidebarTrigger>
              <SiteHeaderContext />
            </div>

            {/* SECTION DROITE: Notifications + User */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <NotificationBell />
                <ExpirationDropdown />
              </div>

              {/* Menu Utilisateur Desktop Premium */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-3 h-11 px-3 hover:bg-blue-50"
                  >
                    <div className="w-9 h-9 ring-2 ring-blue-200 rounded-full overflow-hidden">
                      <img
                        src={avatarUrl}
                        alt={user?.name || "Avatar"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getAvatarUrl(); // Utilise l'avatar par défaut
                        }}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">{user?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        Utilisateur • {user?.isPremium ? 'Abonné' : 'Gratuit'}
                      </p>
                    </div>
                    <ChevronDown size={16} className="text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-2">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-3 p-2">
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <img
                          src={avatarUrl}
                          alt={user?.name || "Avatar"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getAvatarUrl();
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">
                            Utilisateur
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user?.isPremium
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user?.isPremium ? 'Abonné' : 'Gratuit'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      to="/workspace"
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Dashboard</p>
                        <p className="text-xs text-muted-foreground">
                          Tableau de bord IA
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <User className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Mon Profil</p>
                        <p className="text-xs text-muted-foreground">
                          Informations personnelles
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      to="/features"
                      className="flex items-center gap-3 p-3 rounded-lg"
                    >
                      <CreditCard className="w-4 h-4" />
                      <div>
                        <p className="font-medium">Mes fonctionnalités</p>
                        <p className="text-xs text-muted-foreground">
                          Gérer votre fonctionnalité
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <LogoutConfirmButton
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-lg"
                      redirectTo="/"
                    />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Avatar mobile */}
              <Avatar className="h-8 w-8 md:hidden">
                <AvatarImage src={avatarUrl} alt={user?.name || "User"} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Bannière workspace suspendu / trial expiré */}
          <WorkspaceSuspendedBanner />

          {/* ✅ CONTENU PRINCIPAL - Flex-1 pour pousser le footer en bas */}
          <main
            className={cn(
              "flex-1 max-w-7xl mx-auto w-full overflow-x-hidden",
              isMobile && "pt-2 sm:pt-4"
            )}
          >
            {children}
          </main>

          {/* ✅ FOOTER AU MÊME NIVEAU QUE LA SIDEBAR */}
        </div>
      </div>
    </SidebarProvider>
  );
}
