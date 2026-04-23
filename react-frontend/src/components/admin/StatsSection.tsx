// react-frontend/src/components/admin/StatsSection.tsx
// ✅ Composant Stats corrigé pour utiliser DashboardStatsController

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  Loader2,
  Globe,
  HeadphonesIcon,
} from "lucide-react";
import {
  adminStatsService,
  AdminDashboardStats,
} from "@/services/adminStatsService";
import { toast } from "sonner";

interface StatsCardProps {
  title: string;
  value: string;
  growth: number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  growth,
  icon,
  subtitle,
  loading = false,
}) => {
  const isPositive = growth >= 0;
  const GrowthIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const growthColor = isPositive ? "text-green-500" : "text-red-500";

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className="rounded-full p-3 bg-slate-100">{icon}</div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className={`flex items-center text-sm ${growthColor}`}>
            <GrowthIcon className="h-4 w-4 mr-1" />
            <span>{Math.abs(growth).toFixed(1)}%</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {subtitle || "vs mois dernier"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const StatsSection: React.FC = () => {
  const [dashboardStats, setDashboardStats] =
    useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Charger les vraies données depuis DashboardStatsController
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📊 [StatsSection] Chargement des statistiques admin...");

      // Utiliser le DashboardStatsController existant
      const stats = await adminStatsService.getDashboardStats();

      console.log("📊 [StatsSection] Stats chargées:", {
        users: stats.totalUsers,
        revenue: stats.revenue,
        sites: stats.sitesCreated,
        tickets: stats.supportTickets,
      });

      setDashboardStats(stats);
    } catch (error) {
      console.error("❌ [StatsSection] Erreur chargement stats:", error);
      setError("Erreur lors du chargement des statistiques");
      toast.error("Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Charger les données au montage
  useEffect(() => {
    loadStats();
  }, []);

  // ✅ Calculer les métriques pour l'affichage
  const getDisplayMetrics = () => {
    if (!dashboardStats) {
      return {
        revenue: "0 €",
        revenueGrowth: 0,
        users: "0",
        usersGrowth: 0,
        sites: "0",
        sitesGrowth: 0,
        tickets: "0",
        ticketsGrowth: 0,
      };
    }

    return {
      revenue: adminStatsService.formatCurrency(dashboardStats.revenue),
      revenueGrowth: dashboardStats.growthRevenue,
      users: dashboardStats.totalUsers.toLocaleString(),
      usersGrowth: dashboardStats.growthUsers,
      sites: dashboardStats.sitesCreated.toLocaleString(),
      sitesGrowth: dashboardStats.growthSites,
      tickets: dashboardStats.supportTickets.toLocaleString(),
      ticketsGrowth: dashboardStats.growthTickets,
    };
  };

  const metrics = getDisplayMetrics();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* ✅ CARTE REVENUS - Vraies données du système FeatureActivationRequest */}
      <StatsCard
        title="Revenus"
        value={metrics.revenue}
        growth={metrics.revenueGrowth}
        icon={<Building className="h-6 w-6 text-slate-600" />}
        subtitle="demandes approuvées"
        loading={loading}
      />

      {/* ✅ CARTE UTILISATEURS - Vraies données */}
      <StatsCard
        title="Utilisateurs"
        value={metrics.users}
        growth={metrics.usersGrowth}
        icon={<Users className="h-6 w-6 text-blue-600" />}
        subtitle="croissance mensuelle"
        loading={loading}
      />

      {/* ✅ CARTE FONCTIONNALITÉS ACTIVÉES (Sites créés) - Vraies données */}
      <StatsCard
        title="Fonctionnalités"
        value={metrics.sites}
        growth={metrics.sitesGrowth}
        icon={<Globe className="h-6 w-6 text-green-600" />}
        subtitle="activations totales"
        loading={loading}
      />

      {/* ✅ CARTE TICKETS SUPPORT - Vraies données */}
      <StatsCard
        title="Support"
        value={metrics.tickets}
        growth={metrics.ticketsGrowth}
        icon={<HeadphonesIcon className="h-6 w-6 text-purple-600" />}
        subtitle="tickets ouverts"
        loading={loading}
      />

      {/* ✅ Affichage d'erreur si nécessaire */}
      {error && (
        <div className="col-span-full">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <p className="font-medium">Erreur de chargement</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <button
                  onClick={loadStats}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ Informations détaillées basées sur les vraies données */}
      {dashboardStats && !loading && (
        <div className="col-span-full mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* Revenus par méthode */}
            {dashboardStats.revenue_breakdown &&
              dashboardStats.revenue_breakdown.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">
                    Top Paiement
                  </p>
                  <p className="text-lg font-bold text-blue-800">
                    {dashboardStats.revenue_breakdown[0].method}
                  </p>
                  <p className="text-xs text-blue-600">
                    {adminStatsService.formatCurrency(
                      dashboardStats.revenue_breakdown[0].total
                    )}
                  </p>
                </div>
              )}

            {/* Activité utilisateur */}
            {dashboardStats.user_activity && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600 font-medium">
                  Utilisateurs Actifs
                </p>
                <p className="text-lg font-bold text-green-800">
                  {dashboardStats.user_activity.active_users_week.toLocaleString()}
                </p>
                <p className="text-xs text-green-600">cette semaine</p>
              </div>
            )}

            {/* Stats fonctionnalités */}
            {dashboardStats.feature_stats && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">
                  Taux d'Activation
                </p>
                <p className="text-lg font-bold text-purple-800">
                  {dashboardStats.feature_stats.activation_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-purple-600">fonctionnalités</p>
              </div>
            )}

            {/* Contenu généré */}
            {dashboardStats.content_stats && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-600 font-medium">
                  Contenu Total
                </p>
                <p className="text-lg font-bold text-orange-800">
                  {dashboardStats.content_stats.total_content.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600">
                  {dashboardStats.content_stats.ai_generated_percentage.toFixed(
                    1
                  )}
                  % IA
                </p>
              </div>
            )}
          </div>

          {/* ✅ Section détaillée des demandes d'activation */}
          {dashboardStats.feature_stats &&
            dashboardStats.feature_stats.pending_requests > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">
                    Demandes en Attente
                  </h4>
                </div>
                <p className="text-sm text-yellow-700">
                  <strong>
                    {dashboardStats.feature_stats.pending_requests}
                  </strong>{" "}
                  demandes d'activation en attente de traitement. Taux
                  d'approbation moyen :
                  <strong>
                    {" "}
                    {dashboardStats.feature_stats.activation_rate.toFixed(1)}%
                  </strong>
                </p>
                {dashboardStats.feature_stats.top_requested &&
                  dashboardStats.feature_stats.top_requested.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-yellow-600">
                        Fonctionnalité la plus demandée :{" "}
                        <strong>
                          {dashboardStats.feature_stats.top_requested[0].name}
                        </strong>
                        (
                        {dashboardStats.feature_stats.top_requested[0].requests}{" "}
                        demandes)
                      </p>
                    </div>
                  )}
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default StatsSection;
