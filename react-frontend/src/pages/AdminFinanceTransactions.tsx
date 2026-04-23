import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Filter } from "lucide-react";

interface Transaction {
  id: number;
  user_id: number;
  user_name: string;
  feature_name: string;
  amount_claimed: number;
  payment_method: string;
  status: string;
  payment_proof: string | null;
  processed_at: string | null;
  created_at: string;
}

const AdminFinanceTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/finance/transactions");
      setTransactions(response.data.data || response.data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      approved: { label: "Approuvé", className: "bg-green-100 text-green-800" },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-800" },
      rejected: { label: "Rejeté", className: "bg-red-100 text-red-800" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodMap: Record<string, { label: string; className: string }> = {
      paypal: { label: "PayPal", className: "bg-blue-100 text-blue-800" },
      stripe: { label: "Stripe", className: "bg-purple-100 text-purple-800" },
      bank_transfer: { label: "Virement", className: "bg-slate-100 text-slate-800" },
      credit_card: { label: "Carte", className: "bg-indigo-100 text-indigo-800" },
    };
    const methodInfo = methodMap[method] || { label: method, className: "bg-gray-100 text-gray-800" };
    return <Badge variant="outline" className={methodInfo.className}>{methodInfo.label}</Badge>;
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tx.feature_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || tx.payment_method === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalAmount = filteredTransactions
    .filter(tx => tx.status === "approved")
    .reduce((sum, tx) => sum + tx.amount_claimed, 0);

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
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Historique complet des demandes d'activation de fonctionnalités
            </p>
          </div>

          {/* Statistiques rapides */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredTransactions.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {filteredTransactions.filter(tx => tx.status === "approved").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">En attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {filteredTransactions.filter(tx => tx.status === "pending").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Montant total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Liste des transactions</CardTitle>
                <CardDescription>
                  Toutes les demandes d'activation avec leurs statuts
                </CardDescription>
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full md:w-[200px]"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="approved">Approuvé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="bank_transfer">Virement</SelectItem>
                    <SelectItem value="credit_card">Carte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Fonctionnalité</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">#{tx.id}</TableCell>
                      <TableCell>{tx.user_name}</TableCell>
                      <TableCell>{tx.feature_name}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(tx.amount_claimed)}</TableCell>
                      <TableCell>{getPaymentMethodBadge(tx.payment_method)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tx.processed_at || tx.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune transaction trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminFinanceTransactions;
