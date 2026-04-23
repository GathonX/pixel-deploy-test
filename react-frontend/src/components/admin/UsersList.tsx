
// src/components/admin/UsersList.tsx
import React, { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import AdminDeleteUserCard from "./AdminDeleteUserCard";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  User as UserIcon,
  Mail,
  MoreHorizontal,
  Edit,
  FileText,
  Share2,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Typage de la réponse brute de l’API
interface ApiUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
  plan?: string;
}

// Ce qu’on affiche dans le tableau
interface DisplayUser {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Utilisateur";
  plan: string;
  registeredDate: string;
  lastLogin: string;
  status: "Actif" | "Inactif";
}

type Tab = "all" | "active" | "inactive" | "premium";

interface Props {
  searchTerm: string;
  currentTab: Tab;
}

const UsersList: React.FC<Props> = ({ searchTerm, currentTab }) => {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ message: string; data: { data: ApiUser[] } }>("/admin/users");
        const apiUsers = res.data.data.data; // Paginated => .data.data
        const mapped: DisplayUser[] = apiUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.is_admin ? "Admin" : "Utilisateur",
          plan: u.plan ?? "Standard",
          registeredDate: new Date(u.created_at).toLocaleDateString("fr-FR"),
          lastLogin: u.last_login
            ? new Date(u.last_login).toLocaleDateString("fr-FR")
            : "-",
          // **TA RÉPONSE RÉELLE** : on se base sur email_verified_at
          status: u.email_verified_at ? "Actif" : "Inactif",
        }));
        setUsers(mapped);
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger les utilisateurs.",
          variant: "destructive",
        });
      }
    })();
  }, [toast]);

  // Filtrage selon l’onglet
  const filtered = users.filter(u => {
    const m =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (currentTab === "active") return m && u.status === "Actif";
    if (currentTab === "inactive") return m && u.status === "Inactif";
    if (currentTab === "premium") return m && u.plan === "Premium";
    return m;
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="hidden md:table-cell">Inscription</TableHead>
            <TableHead className="hidden md:table-cell">Dernière connexion</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length > 0 ? (
            filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === "Admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {u.role}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.plan === "Premium"
                        ? "bg-blue-100 text-blue-800"
                        : u.plan === "Standard"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {u.plan}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{u.registeredDate}</TableCell>
                <TableCell className="hidden md:table-cell">{u.lastLogin}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.status === "Actif"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {u.status}
                  </span>
                </TableCell>
                <TableCell className="text-right flex justify-end space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/users/${u.id}`}>
                          <UserIcon className="h-4 w-4 mr-2" />
                          Voir le profil
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/users/${u.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier l'utilisateur
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Envoyer un email
                      </DropdownMenuItem>
                      {/* ✅ NOUVEAU : Liens vers les contenus utilisateur */}
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/users/${u.id}/blog-posts`}>
                          <FileText className="h-4 w-4 mr-2" />
                          📝 Blog Posts
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/users/${u.id}/social-posts`}>
                          <Share2 className="h-4 w-4 mr-2" />
                          📱 Social Posts
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/admin/users/${u.id}/sprints`}>
                          <Target className="h-4 w-4 mr-2" />
                          🎯 Sprints
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AdminDeleteUserCard
                    userId={u.id}
                    userName={u.name}
                    onDeleted={() =>
                      setUsers(prev => prev.filter(x => x.id !== u.id))
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UsersList;
