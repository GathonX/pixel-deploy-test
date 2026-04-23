

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  CreditCard,
  Settings,
  Users,
  ShieldAlert,
  Ticket,
  LineChart,
  Download,
  Gauge,
  Lock,
  Database,
  FileCode,
  Newspaper,
  Bot,
  Menu,
  Bell,
  Sparkles,
  FileText,
  Globe,
  ShoppingCart,
  LayoutDashboard,
  Building2,
  BadgeDollarSign,
  ReceiptText,
  ClipboardCheck,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import NotificationBell from "../ui/notification-bell";
import LogoutConfirmButton from "@/components/auth/LogoutConfirmButton";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  submenu?: NavItem[];
  isExpanded?: boolean;
}



const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, getAvatarUrl } = useAuth();

  const [navItems, setNavItems] = useState<NavItem[]>([
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: Gauge,
    },
    {
      title: "Workspaces",
      href: "/admin/workspaces",
      icon: Building2,
    },
    {
      title: "Paiements",
      href: "#",
      icon: BadgeDollarSign,
      submenu: [
        {
          title: "Commandes & Preuves",
          href: "/admin/site-builder/purchases",
          icon: ClipboardCheck,
        },
        {
          title: "Factures Workspace",
          href: "/admin/billing/invoices",
          icon: ReceiptText,
        },
      ],
      isExpanded: false,
    },
    {
      title: "Utilisateurs",
      href: "/admin/users",
      icon: Users,
      submenu: [
        {
          title: "Liste des utilisateurs",
          href: "/admin/users",
          icon: Users,
        },
        {
          title: "Activité",
          href: "#",
          icon: LineChart,
          submenu: [
            {
              title: "Visiteurs",
              href: "/admin/user-agents/users",
              icon: Users,
            },
            {
              title: "Admin",
              href: "/admin/user-agents/admin",
              icon: ShieldAlert,
            },
          ],
          isExpanded: false,
        },
      ],
      isExpanded: false,
    },

    {
      title: "Fonctionnalités",
      href: "/admin/features",
      icon: Settings,
    },
    {
      title: "Sécurité",
      href: "/admin/security",
      icon: ShieldAlert,
      submenu: [
        {
          title: "Journaux",
          href: "/admin/security/logs",
          icon: Database,
        },
        {
          title: "Permissions",
          href: "/admin/security/permissions",
          icon: Lock,
        },
      ],
      isExpanded: false,
    },
    {
      title: "Tickets",
      href: "/admin/tickets",
      icon: Ticket,
    },
    {
      title: "Configuration IA",
      href: "/admin/ai-config",
      icon: Bot,
      submenu: [
      ],
      isExpanded: false,
    },
    {
      title: "Blog",
      href: "#",
      icon: Newspaper,
      submenu: [
        {
          title: "Génération de Contenu",
          href: "/admin/content-generation",
          icon: Sparkles,
        },
        {
          title: "Gestion des Posts",
          href: "/admin/blog-posts",
          icon: FileText,
        },
        {
          title: "Blog Public",
          href: "/blog",
          icon: Globe,
        },
      ],
      isExpanded: false,
    },
    {
      title: "Codes Embed",
      href: "/admin/embed-codes",
      icon: FileCode,
    },
    {
      title: "Studio Domaine",
      href: "/admin/studio-domaine",
      icon: Globe,
    },
    {
      title: "Site Builder",
      href: "/admin/site-builder",
      icon: Globe,
      submenu: [
        {
          title: "Dashboard",
          href: "/admin/site-builder",
          icon: LayoutDashboard,
        },
        {
          title: "Templates",
          href: "/admin/site-builder/templates",
          icon: FileCode,
        },
        {
          title: "Paramètres",
          href: "/admin/site-builder/settings",
          icon: Settings,
        },
      ],
      isExpanded: false,
    },
    {
      title: "Finance",
      href: "/admin/finance",
      icon: CreditCard,
      submenu: [
        {
          title: "Revenus",
          href: "/admin/finance/revenue",
          icon: LineChart,
        },
        {
          title: "Transactions",
          href: "/admin/finance/transactions",
          icon: CreditCard,
        },
      ],
      isExpanded: false,
    },
    {
      title: "Rapports",
      href: "/admin/reports",
      icon: FileCode,
      submenu: [
        {
          title: "Export",
          href: "/admin/reports/export",
          icon: Download,
        },
      ],
      isExpanded: false,
    },
  ]);

  const toggleSubMenu = (index: number, parentIndex?: number) => {
    const updated = [...navItems];
    if (parentIndex !== undefined) {
      updated[parentIndex].submenu![index].isExpanded = !updated[parentIndex].submenu![index].isExpanded;
    } else {
      updated[index].isExpanded = !updated[index].isExpanded;
    }
    setNavItems(updated);
  };

  const isActive = (href: string) => location.pathname === href;

  const renderNavItems = (items: NavItem[], parentIndex?: number) => (
    items.map((item, index) => (
      <div key={index}>
        {item.submenu ? (
          <>
            <button
              onClick={() => toggleSubMenu(index, parentIndex)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                isSubMenuActive(item.submenu)
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <div className="flex items-center">
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </div>
              <ChevronIcon className={`h-4 w-4 transition-transform ${item.isExpanded ? "rotate-180" : ""}`} />
            </button>
            {item.isExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {renderNavItems(item.submenu, index)}
              </div>
            )}
          </>
        ) : (
          <Link
            to={item.href}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
              isActive(item.href)
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <item.icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        )}
      </div>
    ))
  );

  const isSubMenuActive = (submenu?: NavItem[]) => {
    return submenu?.some(item => location.pathname === item.href || isSubMenuActive(item.submenu)) ?? false;
  };

  // ✅ SYNCHRONISATION : Utiliser getAvatarUrl du contexte
  const avatarUrl = getAvatarUrl(user?.avatar);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r">
          <div className="h-16 border-b flex items-center justify-between px-6">
            <Link to="/admin/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-lg transform rotate-12"></div>
              <span className="ml-2 text-xl font-bold">Admin</span>
            </Link>
          </div>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="px-3 py-2">
              <div className="space-y-1">
                {renderNavItems(navItems)}
              </div>
            </div>
          </ScrollArea>
          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
            <Link to="/admin/settings" className="flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>
        </Sidebar>
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 sm:h-16 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6">
            <SidebarTrigger>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SidebarTrigger>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={avatarUrl} alt={user?.name || "Admin"} />
                    <AvatarFallback>{user?.name?.charAt(0) || 'A'}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <LogoutConfirmButton
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      redirectTo="/login"
                      fullWidth
                    />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className={cn("flex-1", isMobile && "pt-2 sm:pt-4")}>{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export { AdminLayout };

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);