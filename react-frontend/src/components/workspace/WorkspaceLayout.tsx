// src/components/workspace/WorkspaceLayout.tsx
import React, { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarHeader } from "@/components/dashboard/SidebarHeader";
import { WorkspaceSidebarContent } from "./WorkspaceSidebarContent";
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

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const isMobile = useIsMobile();
  const { user, getAvatarUrl } = useAuth();

  const avatarUrl = getAvatarUrl(user?.avatar);

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
        {/* Sidebar Workspace — accent indigo */}
        <Sidebar className="border-r border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white">
          <SidebarHeader />
          <WorkspaceSidebarContent />
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header
            className={cn(
              "h-18 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 transition-all duration-300 sticky top-0 z-50",
              "bg-white/80 backdrop-blur-md border-white/20",
              isScrolled &&
                "bg-white/95 shadow-lg shadow-black/5 border-slate-200/50"
            )}
          >
            {/* Gauche: trigger mobile */}
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SidebarTrigger>
            </div>

            {/* Droite: notifications + user */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <NotificationBell />
                <ExpirationDropdown />
              </div>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-3 h-11 px-3 hover:bg-indigo-50"
                  >
                    <div className="w-9 h-9 ring-2 ring-indigo-200 rounded-full overflow-hidden">
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
                    <div className="text-left">
                      <p className="font-medium text-sm">{user?.name}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        Workspace • {user?.isPremium ? "Abonné" : "Gratuit"}
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
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                            Workspace
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              user?.isPremium
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {user?.isPremium ? "Abonné" : "Gratuit"}
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
                      <LayoutDashboard className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Mes projets</p>
                        <p className="text-xs text-muted-foreground">
                          Gérer vos projets
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
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Bannière suspension / trial expiré */}
          <WorkspaceSuspendedBanner />

          {/* Contenu principal */}
          <main
            className={cn(
              "flex-1 max-w-7xl mx-auto w-full",
              isMobile && "pt-2 sm:pt-4"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
