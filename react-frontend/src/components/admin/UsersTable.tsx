import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Filter,
  Search,
  Users as UsersIcon,
  User as UserIcon,
  Shield,
} from "lucide-react";
import UsersList from "./UsersList";
import { useAdminUserStats } from "@/hooks/useAdminUserStats";

type Tab = "all" | "active" | "inactive" | "premium";

const UsersTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentTab, setCurrentTab] = useState<Tab>("all");

  const { data: stats, isLoading: statsLoading } = useAdminUserStats();

  // si en chargement, afficher 0
  const total    = stats?.total    ?? 0;
  const active   = stats?.active   ?? 0;
  const inactive = stats?.inactive ?? 0;
  const premium  = stats?.premium  ?? 0;

  return (
    <>
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-muted-foreground opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Actifs</p>
              <p className="text-2xl font-bold">{active}</p>
            </div>
            <UserIcon className="h-8 w-8 text-green-500 opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Inactifs</p>
              <p className="text-2xl font-bold">{inactive}</p>
            </div>
            <UserIcon className="h-8 w-8 text-amber-500 opacity-70" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Premium</p>
              <p className="text-2xl font-bold">{premium}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-500 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* Contrôles & tableau */}
      <Card className="mb-8">
        <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Liste des utilisateurs</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher..."
                className="pl-8 w-full md:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />Filtres
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCurrentTab("all")}>Tous</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentTab("active")}>Actifs</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentTab("inactive")}>Inactifs</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentTab("premium")}>Premium</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            defaultValue={currentTab}
            onValueChange={(v: Tab) => setCurrentTab(v)}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="active">Actifs</TabsTrigger>
              <TabsTrigger value="inactive">Inactifs</TabsTrigger>
              <TabsTrigger value="premium">Premium</TabsTrigger>
            </TabsList>
          </Tabs>

          <UsersList
            searchTerm={searchTerm}
            currentTab={currentTab}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default UsersTable;
