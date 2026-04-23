
import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, Bell } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLogout } from '@/hooks/useLogout';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth'; // ✅ Utiliser useAuth pour synchronisation avatar


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayoutAdmin({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
const location = useLocation();
const navigate = useNavigate();
const { logout, isLoading } = useLogout();
const { user, getAvatarUrl } = useAuth(); // ✅ Utiliser useAuth avec getAvatarUrl


 // ✅ SYNCHRONISATION : Utiliser getAvatarUrl du contexte
  const avatarUrl = getAvatarUrl(user?.avatar);


  return (

      <div className="min-h-screen flex w-full">
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6">
            <SidebarTrigger>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SidebarTrigger>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
              
              <Avatar className="h-8 w-8 md:hidden">
                <AvatarImage src={avatarUrl} alt={user?.name || "User"} />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          
          <div className={cn("flex-1", isMobile && "pt-2 sm:pt-4")}>
            {children}
          </div>
        </main>
      </div>
  
  );
}
