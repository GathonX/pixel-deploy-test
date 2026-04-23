import {
  SidebarContent as UiSidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocation, Link } from "react-router-dom";
import {
  Home,
  Calendar,
  Package,
  CreditCard,
  Users,
  Globe2,
  TicketCheck,
  SlidersHorizontal,
  Layout,
  ChevronDown,
  Search,
  Flag,
} from "lucide-react";
import { WorkspacePlanBadge } from "@/components/workspace/WorkspacePlanBadge";
import { useWorkspace } from "@/hooks/useWorkspace";

export function WorkspaceSidebarContent() {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const isEntreprise = workspace?.plan_key === 'premium';

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <UiSidebarContent className="p-2">
        {/* Badge Workspace + Plan */}
        <WorkspacePlanBadge />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-indigo-400 uppercase tracking-wider px-2 mb-1">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/workspace")}>
                  <Link to="/workspace">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Accueil</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/mada-booking/dashboard"}>
                  <Link to="/mada-booking/dashboard">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-500" />
                      <span className="font-medium">Plannings</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/mada-booking/dashboard/produits"}>
                  <Link to="/mada-booking/dashboard/produits">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Produits</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    location.pathname === "/site-builder" ||
                    location.pathname.startsWith("/site-builder/")
                  }
                >
                  <Link to="/site-builder?from=workspace">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">Mes projets</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isEntreprise && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard/tasks")}>
                    <Link to="/dashboard/tasks">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Tâches</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-indigo-400 uppercase tracking-wider px-2 mb-1">
            Gestion
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    isActive("/workspace/settings") ||
                    location.pathname.startsWith("/workspace/manage/") ||
                    /^\/workspace\/[^/]+$/.test(location.pathname) && !["billing","users","demandes","planning","settings","setup","manage"].includes(location.pathname.split("/")[2])
                  }
                >
                  <Link to="/workspace/settings">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Gestion de workplace</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/billing")}>
                  <Link to="/billing">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium">Plan et facturation</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/workspace/users")}>
                  <Link to="/workspace/users">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-500" />
                      <span className="font-medium">Utilisateurs</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={location.pathname.startsWith("/studio-domaine")}
                      className="w-full"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Globe2 className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">Domaines</span>
                        <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-4 mt-1 space-y-0.5">
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={isActive("/studio-domaine")} className="text-sm">
                          <Link to="/studio-domaine?from=workspace">
                            <div className="flex items-center gap-2">
                              <Home className="w-3.5 h-3.5" />
                              <span>Dashboard</span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={isActive("/studio-domaine/search")} className="text-sm">
                          <Link to="/studio-domaine/search?from=workspace">
                            <div className="flex items-center gap-2">
                              <Search className="w-3.5 h-3.5" />
                              <span>Recherche domaine</span>
                            </div>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-indigo-400 uppercase tracking-wider px-2 mb-1">
            Aide
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/dashboard/tickets")}>
                  <Link to="/dashboard/tickets?from=workspace">
                    <div className="flex items-center gap-2">
                      <TicketCheck className="w-4 h-4 text-rose-500" />
                      <span className="font-medium">Support</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </UiSidebarContent>

      <SidebarFooter className="p-3 border-t border-indigo-100">
        <p className="text-xs text-slate-400 text-center">Workspace global</p>
      </SidebarFooter>
    </>
  );
}
