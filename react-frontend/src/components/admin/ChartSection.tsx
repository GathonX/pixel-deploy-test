// src/components/admin/ChartSection.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Couleurs pour le camembert (reste fixe)
const COLORS = ["#94a3b8", "#64748b", "#475569"];

// Valeurs par défaut pour la répartition des abonnements
const DEFAULT_PLAN_DISTRIBUTION = [
  { name: "Free", value: 400 },
  { name: "Standard", value: 300 },
  { name: "Premium", value: 300 },
];

export default function ChartSection() {
  const { toast } = useToast();

  // Initialisation de la croissance utilisateurs à zéro pour chaque mois
  const [userStatsData, setUserStatsData] = useState<
    Array<{ month: string; users: number }>
  >([
    { month: "Jan", users: 0 },
    { month: "Feb", users: 0 },
    { month: "Mar", users: 0 },
    { month: "Apr", users: 0 },
    { month: "May", users: 0 },
    { month: "Jun", users: 0 },
    { month: "Jul", users: 0 },
  ]);

  // On garde la répartition des abonnements en valeurs par défaut
  const [planDistribution] = useState(DEFAULT_PLAN_DISTRIBUTION);

  useEffect(() => {
    const fetchUserGrowth = async () => {
      try {
        // Supposons un endpoint qui renvoie un tableau { month, users }
        const { data } = await api.get<
          Array<{ month: string; users: number }>
        >("/admin/dashboard/user-growth");

        // Si on reçoit bien des données au bon format, on les applique
        if (Array.isArray(data) && data.length > 0) {
          setUserStatsData(data);
        }
      } catch {
        toast({
          title: "Erreur",
          description: "Impossible de charger la croissance des utilisateurs.",
          variant: "destructive",
        });
        // on conserve l’état initial à zéro
      }
    };

    fetchUserGrowth();
  }, [toast]);

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      {/* Croissance utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Croissance utilisateurs
          </CardTitle>
          <CardDescription>
            Nombre d'utilisateurs enregistrés par mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userStatsData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="users"
                fill="#475569"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Répartition des abonnements (valeurs par défaut) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            Répartition des abonnements
          </CardTitle>
          <CardDescription>
            Distribution des plans d'abonnement actifs
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent! * 100).toFixed(0)}%`
                }
              >
                {planDistribution.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[idx % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
