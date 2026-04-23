
import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MonthlyRevenue {
  month: string;
  month_name: string;
  revenue: number;
  requests: number;
}

interface PaymentMethod {
  method: string;
  total: number;
  count: number;
  average: number;
}

interface TopFeature {
  feature_name: string;
  feature_price: number;
  total_revenue: number;
  requests: number;
  average_amount: number;
}

interface FinanceStats {
  total_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  last_month_revenue: number;
  revenue_growth: number;
  total_requests: number;
  approved_requests: number;
  pending_requests: number;
  rejected_requests: number;
  approval_rate: number;
  average_amount: number;
  payment_methods: PaymentMethod[];
  monthly_evolution: MonthlyRevenue[];
  top_features: TopFeature[];
}

const AdminFinanceRevenue: React.FC = () => {
  const [period, setPeriod] = useState("this-year");
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFinanceStats = async () => {
      try {
        setLoading(true);
        const response = await api.get("/admin/dashboard/finance-stats");
        setFinanceStats(response.data.data);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les statistiques financières",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceStats();
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getRevenueData = () => {
    if (!financeStats) return [];
    return financeStats.monthly_evolution.map(item => ({
      month: item.month_name.split(' ')[0],
      revenue: item.revenue,
      users: item.requests,
    }));
  };

  const getPlanDistributionData = () => {
    if (!financeStats) return [];
    return financeStats.payment_methods.map(method => ({
      plan: method.method,
      value: method.total,
      users: method.count,
    }));
  };


  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenus</h1>
            <p className="text-muted-foreground">
              Suivi et analyse des revenus de la plateforme
            </p>
          </div>
          
          <Select
            value={period}
            onValueChange={setPeriod}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Ce mois</SelectItem>
              <SelectItem value="last-month">Mois précédent</SelectItem>
              <SelectItem value="last-quarter">Dernier trimestre</SelectItem>
              <SelectItem value="this-year">Cette année</SelectItem>
              <SelectItem value="all-time">Tout temps</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cartes de résumé */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenu total
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financeStats ? formatCurrency(financeStats.total_revenue) : "0,00 €"}
              </div>
              <p className="text-xs text-muted-foreground">
                {financeStats ? `${financeStats.revenue_growth >= 0 ? '+' : ''}${financeStats.revenue_growth.toFixed(1)}%` : '+0%'} par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenu mensuel moyen
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financeStats ? formatCurrency(financeStats.average_amount) : "0,00 €"}
              </div>
              <p className="text-xs text-muted-foreground">
                Montant moyen par demande approuvée
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demandes approuvées</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financeStats ? financeStats.approved_requests : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Sur {financeStats ? financeStats.total_requests : 0} demandes totales
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taux d'approbation
              </CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financeStats ? `${financeStats.approval_rate.toFixed(1)}%` : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                {financeStats ? financeStats.pending_requests : 0} demandes en attente
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="analytics">Analytiques</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenus mensuels</CardTitle>
                <CardDescription>
                  Évolution des revenus sur les 12 derniers mois
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getRevenueData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} €`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#2563eb"
                        strokeWidth={2}
                        name="Revenus (€)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par abonnement</CardTitle>
                  <CardDescription>
                    Revenus générés par type d'abonnement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPlanDistributionData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="plan" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value.toLocaleString()} €`} />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" name="Revenus (€)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Nombre de transactions</CardTitle>
                  <CardDescription>
                    Nombre de transactions par méthode de paiement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getPlanDistributionData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="plan" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="users" fill="#10b981" name="Transactions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des revenus et utilisateurs</CardTitle>
                <CardDescription>
                  Corrélation entre le nombre d'utilisateurs et les revenus
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getRevenueData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" orientation="left" stroke="#2563eb" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#2563eb"
                        strokeWidth={2}
                        name="Revenus (€)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="users"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Demandes"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Fonctionnalités par Revenus</CardTitle>
                <CardDescription>
                  Les fonctionnalités générant le plus de revenus
                </CardDescription>
              </CardHeader>
              <CardContent>
                {financeStats && financeStats.top_features.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fonctionnalité</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Revenus totaux</TableHead>
                        <TableHead>Demandes</TableHead>
                        <TableHead>Montant moyen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financeStats.top_features.map((feature, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{feature.feature_name}</TableCell>
                          <TableCell>{formatCurrency(feature.feature_price)}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(feature.total_revenue)}
                          </TableCell>
                          <TableCell>{feature.requests}</TableCell>
                          <TableCell>{formatCurrency(feature.average_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminFinanceRevenue;
