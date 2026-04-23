// src/components/dashboard/DashboardStats.tsx - VERSION DYNAMIQUE AVEC VRAIES DONNÉES

import { useEffect, useState } from "react";
import { Users, TrendingUp, Calendar, CreditCard, Eye, MessageSquare, Clock, BarChart } from "lucide-react";
import { analyticsService, DashboardStats as DashboardStatsType } from "@/services/analyticsService";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  subtitle?: string;
  loading?: boolean;
}

const StatCard = ({ title, value, change, icon, iconBgColor, iconColor, subtitle, loading }: StatCardProps) => {
  const isPositive = !change.includes('-') && !change.includes('Stable');
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-slate-100 animate-pulse">
            <div className="h-5 w-5 bg-slate-300 rounded"></div>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 bg-slate-200 rounded animate-pulse mb-1"></div>
            <div className="h-3 bg-slate-200 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-full ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <h3 className="text-sm text-slate-500 font-medium">{title}</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          </div>
          <p className={`text-xs font-medium mt-1 ${
            isPositive ? 'text-green-600' : change.includes('Stable') ? 'text-slate-500' : 'text-red-500'
          }`}>
            {change}
          </p>
        </div>
      </div>
    </div>
  );
};

const iconMap = {
  Eye: <Eye className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  MessageSquare: <MessageSquare className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  CreditCard: <CreditCard className="h-5 w-5" />,
  BarChart: <BarChart className="h-5 w-5" />
};

export function DashboardStats({ siteId }: { siteId?: string }) {
  const [stats, setStats] = useState<DashboardStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('📊 [DashboardStats] Chargement des statistiques...');
        setLoading(true);
        setError(null);

        const data = await analyticsService.getDashboardStats(siteId);

        console.log('📊 [DashboardStats] Statistiques chargées:', data);
        setStats(data);

      } catch (err) {
        console.error('❌ [DashboardStats] Erreur chargement:', err);
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [siteId]);

  // Affichage d'erreur
  if (error && !loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-red-100 rounded-full">
              <BarChart className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Impossible de charger les statistiques</h3>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Données formatées pour l'affichage
  const formattedStats = stats ? analyticsService.formatStatsForDashboard(stats) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {loading ? (
        // Skeleton loading pour 8 cartes
        Array.from({ length: 8 }).map((_, index) => (
          <StatCard 
            key={index}
            title=""
            value=""
            change=""
            icon={<div className="h-5 w-5" />}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-300"
            loading={true}
          />
        ))
      ) : (
        // Statistiques réelles
        formattedStats.map((stat, index) => (
          <StatCard 
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={iconMap[stat.icon as keyof typeof iconMap] || <BarChart className="h-5 w-5" />}
            iconBgColor={stat.iconBgColor}
            iconColor={stat.iconColor}
            subtitle={stat.subtitle}
          />
        ))
      )}
    </div>
  );
}