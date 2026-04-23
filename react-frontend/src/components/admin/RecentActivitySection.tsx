// src/components/admin/RecentActivitySection.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface RecentUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
  plan?: string;
}

export default function RecentActivitySection() {
  const { toast } = useToast();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/users", {
          params: { per_page: 4, sort: "created_at", order: "desc" },
        });
        const data = res.data.data.data as RecentUser[];
        setRecentUsers(data);
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger l’activité récente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [toast]);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Les derniers utilisateurs inscrits sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">…</TableCell>
                      <TableCell>…</TableCell>
                      <TableCell>…</TableCell>
                      <TableCell>
                        <Badge variant="outline">…</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                : recentUsers.length > 0
                ? recentUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {u.plan ?? "Standard"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucun utilisateur récent
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>Alertes de sécurité récentes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune alerte de sécurité récente</p>
            <p className="text-xs mt-1">Le système fonctionne normalement</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
