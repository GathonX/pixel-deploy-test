// src/pages/ReservationsDashboard.tsx - DASHBOARD RÉSERVATIONS (mada-booking)

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import {
  Menu, CalendarCheck, Eye, CheckCircle, Clock, Users, Phone, Mail,
  MoreVertical, AlertCircle, Copy, ExternalLink, Trash2,
} from 'lucide-react';

import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'maintenance';

interface MadaReservation {
  id: string;
  product_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_date: string;
  end_date: string;
  persons: number;
  adults: number | null;
  children: number | null;
  status: ReservationStatus;
  notes: string;
  created_at: string;
  product?: { name: string; type: string };
}

const ReservationsDashboardContent: React.FC = () => {
  const { setOpenMobile } = useSidebar();
  const { loading } = useAuth();
  const { toast } = useToast();
  const { siteId } = useParams<{ siteId?: string }>();

  const [reservations, setReservations] = useState<MadaReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReservation, setSelectedReservation] = useState<MadaReservation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ReservationStatus>('pending');
  const [copiedLink, setCopiedLink] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<MadaReservation | null>(null);

  const bookingLink = siteId
    ? `${window.location.origin}/mada-booking/reserver?site_id=${siteId}`
    : '';

  const loadData = async (): Promise<void> => {
    if (!siteId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await api.get(`/booking/${siteId}/reservations`);
      const list: MadaReservation[] = Array.isArray(data) ? data : (data?.data ?? []);
      setReservations(list.filter(r => r.status !== 'maintenance'));
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les réservations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [siteId]);

  const stats = useMemo(() => ({
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    totalPersons: reservations.reduce((sum, r) => sum + (r.persons || 0), 0),
  }), [reservations]);

  const filtered = useMemo(() => reservations.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      r.client_name?.toLowerCase().includes(q) ||
      r.client_email?.toLowerCase().includes(q) ||
      r.client_phone?.includes(q);
    return matchesStatus && matchesSearch;
  }), [reservations, statusFilter, search]);

  const handleStatusUpdate = async (): Promise<void> => {
    if (!selectedReservation || !siteId) return;
    try {
      await api.post(`/booking/${siteId}/reservations/${selectedReservation.id}/status`, {
        status: newStatus,
        reason: '',
      });
      toast({ title: "Statut mis à jour" });
      setStatusUpdateOpen(false);
      loadData();
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    }
  };

  const handleDeleteReservation = async (): Promise<void> => {
    if (!reservationToDelete || !siteId) return;
    try {
      await api.delete(`/booking/${siteId}/reservations/${reservationToDelete.id}`);
      toast({ title: "Réservation supprimée" });
      setDeleteConfirmOpen(false);
      setReservationToDelete(null);
      loadData();
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    setCopiedLink(true);
    toast({ title: "Lien copié !" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmée</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-red-200">Annulée</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      className="flex h-screen bg-gradient-landing relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <SidebarInset className="bg-white/90 backdrop-blur-sm border-r border-slate-200">
        <div className="p-6 overflow-y-auto max-h-screen">
          {/* Header */}
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2 hover:bg-slate-100/50"
              onClick={() => setOpenMobile(true)}
            >
              <Menu className="h-5 w-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-brand-black flex items-center gap-2">
                <CalendarCheck className="h-6 w-6 text-brand-blue" />
                Dashboard Réservations
              </h1>
              <p className="text-sm text-text-secondary">Gérez toutes vos réservations en un coup d'œil</p>
            </div>
          </div>

          {/* Lien de réservation public */}
          {siteId && (
            <Card className="mb-6 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-brand-blue" />
                  Lien de réservation public
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">
                  Partagez ce lien pour permettre à vos clients de réserver directement.
                </p>
                <div className="flex gap-2">
                  <Input value={bookingLink} readOnly className="font-mono text-sm bg-white" />
                  <Button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90"
                  >
                    {copiedLink ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedLink ? 'Copié !' : 'Copier'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Ajoutez ce lien comme bouton sur votre site :{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded">
                    {'<a href="' + bookingLink + '">Réserver</a>'}
                  </code>
                </p>
              </CardContent>
            </Card>
          )}

          {!siteId && (
            <Card className="mb-6 border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 text-sm text-amber-700">
                Accédez à cette page depuis un site spécifique pour voir ses réservations et générer son lien de réservation.
              </CardContent>
            </Card>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border border-slate-200 bg-gradient-card shadow-premium">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Total</p>
                    <p className="text-2xl font-bold text-brand-black">{stats.total}</p>
                  </div>
                  <CalendarCheck className="h-8 w-8 text-brand-blue" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-gradient-card shadow-premium">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">En attente</p>
                    <p className="text-2xl font-bold text-brand-yellow">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-brand-yellow" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-gradient-card shadow-premium">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Confirmées</p>
                    <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-gradient-card shadow-premium">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">Total Personnes</p>
                    <p className="text-2xl font-bold text-brand-blue">{stats.totalPersons}</p>
                  </div>
                  <Users className="h-8 w-8 text-brand-blue" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <Card className="mb-6 border border-slate-200 bg-gradient-card shadow-premium">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 border-slate-300 focus:border-brand-blue"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="confirmed">Confirmées</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
                  className="whitespace-nowrap border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white transition-all duration-300"
                >
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border border-slate-200 bg-gradient-card shadow-premium">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-brand-black flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-brand-blue" />
                Réservations ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : !siteId ? (
                <div className="text-center py-8 text-text-secondary">
                  <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="font-medium">Sélectionnez un site pour voir ses réservations</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-brand-black font-medium">Aucune réservation trouvée</p>
                  <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Personnes</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">{r.client_name || 'Nom non fourni'}</p>
                              {r.client_email && (
                                <p className="text-sm text-text-secondary flex items-center gap-1">
                                  <Mail className="h-3 w-3" />{r.client_email}
                                </p>
                              )}
                              {r.client_phone && (
                                <p className="text-sm text-text-secondary flex items-center gap-1">
                                  <Phone className="h-3 w-3" />{r.client_phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.product?.name || '—'}</p>
                              {r.product?.type && (
                                <p className="text-xs text-muted-foreground capitalize">{r.product.type}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">
                                {new Date(r.start_date).toLocaleDateString('fr-FR')}
                              </p>
                              {r.end_date && r.end_date !== r.start_date && (
                                <p className="text-sm text-text-secondary">
                                  → {new Date(r.end_date).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-brand-blue" />
                              <span className="font-medium text-brand-black">{r.persons}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(r.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedReservation(r); setDetailsOpen(true); }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => { setSelectedReservation(r); setNewStatus(r.status); setStatusUpdateOpen(true); }}>
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Changer statut
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => { setReservationToDelete(r); setDeleteConfirmOpen(true); }}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      {/* Dialog Détails */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl border border-slate-200 bg-gradient-card">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-brand-black flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-brand-blue" />
              Détails de la réservation
            </DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Produit</Label>
                  <p className="text-sm text-slate-600">{selectedReservation.product?.name || '—'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedReservation.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Nom client</Label>
                  <p className="text-sm text-slate-600">{selectedReservation.client_name || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-slate-600">{selectedReservation.client_email || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Téléphone</Label>
                  <p className="text-sm text-slate-600">{selectedReservation.client_phone || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date d'arrivée</Label>
                  <p className="text-sm text-slate-600">{new Date(selectedReservation.start_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date de départ</Label>
                  <p className="text-sm text-slate-600">{new Date(selectedReservation.end_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Personnes</Label>
                  <p className="text-sm text-slate-600">
                    {selectedReservation.persons}
                    {(selectedReservation.adults !== null || selectedReservation.children !== null) && (
                      <span className="text-muted-foreground ml-1">
                        ({selectedReservation.adults ?? 0} ad. + {selectedReservation.children ?? 0} enf.)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {selectedReservation.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-slate-600 mt-1">{selectedReservation.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Changement de statut */}
      <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nouveau statut</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as ReservationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleStatusUpdate}
                className="flex-1 bg-gradient-cta hover:bg-gradient-cta-hover text-white border-0"
              >
                Mettre à jour
              </Button>
              <Button
                variant="outline"
                onClick={() => setStatusUpdateOpen(false)}
                className="border-slate-300 text-text-secondary hover:bg-slate-100"
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation Suppression */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md border border-red-200 bg-gradient-card">
          <DialogHeader className="border-b border-red-200 pb-4">
            <DialogTitle className="text-brand-black flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          {reservationToDelete && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm text-red-800">
                  Cette action est irréversible. La réservation sera définitivement supprimée.
                </AlertDescription>
              </Alert>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-text-secondary mb-2">Vous êtes sur le point de supprimer :</p>
                <p className="font-medium text-brand-black">{reservationToDelete.client_name}</p>
                <p className="text-sm text-text-secondary">{reservationToDelete.client_email}</p>
                <p className="text-sm text-text-secondary">
                  {new Date(reservationToDelete.start_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteReservation}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setDeleteConfirmOpen(false); setReservationToDelete(null); }}
                  className="border-slate-300 text-text-secondary hover:bg-slate-100"
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

const ReservationsDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <ReservationsDashboardContent />
    </DashboardLayout>
  );
};

export default ReservationsDashboard;
