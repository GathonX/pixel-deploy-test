// ✅ components/pages/AdminUserAgents.tsx — version dynamique selon user_type
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import api from "@/services/api";

interface UserAgent {
  id: number;
  agent: string;
  page: string;
  language: string;
  timezone: string;
  ip_address: string;
  created_at: string;
}

export default function AdminUserAgents() {
  const location = useLocation();
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // ➤ Déduire le type de user à partir de l'URL
  const userType = location.pathname.includes("admin") ? "admin" : "user";

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/user-agents", {
        params: {
          page_filter: search,
          user_type: userType,
        },
      });
      setAgents(response.data.data);
    } catch (err) {
      console.error("Erreur lors du chargement des user-agents", err);
    } finally {
      setLoading(false);
    }
  }, [search, userType]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return (
    <AdminLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">User Agents - {userType === "admin" ? "Admin" : "Visiteurs"}</h1>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Filtrer par page..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={fetchAgents} disabled={loading}>
            {loading ? "Chargement..." : "Rechercher"}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Langue</TableHead>
              <TableHead>Fuseau</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>User-Agent</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Aucun user-agent trouvé.
                </TableCell>
              </TableRow>
            ) : (
              agents.map((ua) => (
                <TableRow key={ua.id}>
                  <TableCell>{ua.page}</TableCell>
                  <TableCell>{ua.language}</TableCell>
                  <TableCell>{ua.timezone}</TableCell>
                  <TableCell>{ua.ip_address}</TableCell>
                  <TableCell>
                    <code className="text-xs break-words whitespace-pre-wrap">
                      {ua.agent}
                    </code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(ua.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
