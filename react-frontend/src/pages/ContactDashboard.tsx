// src/pages/ContactDashboard.tsx - DASHBOARD CONTACTS

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, Mail, Search, Filter, Eye, CheckCircle, MessageSquare, Clock, Users, Calendar as CalendarIcon, TrendingUp, Phone, MoreVertical, AlertCircle, Trash2 } from 'lucide-react';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import contactService, { type Contact, type ContactStatsData, type ContactFilters } from '@/services/contactService';

const ContactDashboardContent: React.FC = () => {
  const { setOpenMobile } = useSidebar();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ContactFilters>({
    per_page: 20,
    page: 1,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState<'pending' | 'read' | 'replied'>('pending');
  const [totalContacts, setTotalContacts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Charger les contacts et statistiques en parallèle
      const [contactsData, statsData] = await Promise.all([
        contactService.getDashboardContacts(filters),
        contactService.getDashboardStats()
      ]);

      setContacts(contactsData.data);
      setTotalContacts(contactsData.total);
      setCurrentPage(contactsData.current_page);
      setStats(statsData);

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données des contacts.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (): Promise<void> => {
    if (!selectedContact) return;

    try {
      await contactService.updateContactStatus(selectedContact.id, {
        status: newStatus,
        note: statusNote
      });

      toast({
        title: "Statut mis à jour",
        description: `Contact ${newStatus === 'read' ? 'marqué comme lu' : newStatus === 'replied' ? 'marqué comme répondu' : 'remis en attente'}.`,
      });

      setStatusUpdateOpen(false);
      setStatusNote('');
      loadDashboardData();

    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContact = async (contactId: number): Promise<void> => {
    try {
      await contactService.deleteContact(contactId);
      toast({
        title: "Contact supprimé",
        description: "Le contact a été supprimé avec succès.",
      });
      loadDashboardData();
    } catch (error) {
      console.error('Erreur suppression contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le contact.",
        variant: "destructive"
      });
    }
  };

  const openDetails = async (contact: Contact): Promise<void> => {
    try {
      const details = await contactService.getContactDetails(contact.id);
      setSelectedContact(details);
      setDetailsOpen(true);

      // Marquer comme lu automatiquement si c'est encore en attente
      if (details.status === 'pending') {
        await contactService.markAsRead(details.id);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails du contact.",
        variant: "destructive"
      });
    }
  };

  const openStatusUpdate = (contact: Contact): void => {
    setSelectedContact(contact);
    setNewStatus(contact.status);
    setStatusUpdateOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'read':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Lu</Badge>;
      case 'replied':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Répondu</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const sourceLabels: Record<string, string> = {
      'iframe': 'Formulaire web',
      'contact_form': 'Formulaire contact',
      'api': 'API',
      'manual': 'Manuel'
    };

    return <Badge variant="outline">{sourceLabels[source] || source}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20">
        <p className="text-gray-600">Utilisateur non trouvé</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex h-screen bg-gradient-landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <SidebarInset className="bg-white/90 backdrop-blur-sm border-r border-slate-200">
        <div className="p-6 overflow-y-auto max-h-screen">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
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
                  <Mail className="h-6 w-6 text-brand-blue" />
                  Dashboard Contacts
                </h1>
                <p className="text-sm text-text-secondary">Gérez tous vos contacts en un coup d'œil</p>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border border-slate-200 bg-gradient-card shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary">Total</p>
                      <p className="text-2xl font-bold text-brand-black">{stats.stats.total_contacts}</p>
                    </div>
                    <Mail className="h-8 w-8 text-brand-blue" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-gradient-card shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary">En attente</p>
                      <p className="text-2xl font-bold text-brand-yellow">{stats.stats.pending_contacts}</p>
                    </div>
                    <Clock className="h-8 w-8 text-brand-yellow" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-gradient-card shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary">Lus</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.stats.read_contacts}</p>
                    </div>
                    <Eye className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 bg-gradient-card shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary">Répondus</p>
                      <p className="text-2xl font-bold text-green-600">{stats.stats.replied_contacts}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filtres */}
          <Card className="mb-6 border border-slate-200 bg-gradient-card shadow-premium">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher par nom, email ou téléphone..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                    className="w-full border-slate-300 focus:border-brand-blue focus:ring-brand-blue"
                  />
                </div>

                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value as any, page: 1 }))}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="read">Lus</SelectItem>
                    <SelectItem value="replied">Répondus</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtre par jour */}
                <Select
                  value={(() => {
                    const today = new Date().toISOString().split('T')[0];
                    if (filters.date_from === today && filters.date_to === today) return 'today';
                    if (filters.date_from && filters.date_to) return 'custom';
                    return 'all';
                  })()}
                  onValueChange={(value) => {
                    const today = new Date().toISOString().split('T')[0];
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];

                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];

                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekStartStr = weekStart.toISOString().split('T')[0];

                    const weekEnd = new Date();
                    weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
                    const weekEndStr = weekEnd.toISOString().split('T')[0];

                    switch (value) {
                      case 'today':
                        setFilters(prev => ({ ...prev, date_from: today, date_to: today, page: 1 }));
                        break;
                      case 'tomorrow':
                        setFilters(prev => ({ ...prev, date_from: tomorrowStr, date_to: tomorrowStr, page: 1 }));
                        break;
                      case 'yesterday':
                        setFilters(prev => ({ ...prev, date_from: yesterdayStr, date_to: yesterdayStr, page: 1 }));
                        break;
                      case 'week':
                        setFilters(prev => ({ ...prev, date_from: weekStartStr, date_to: weekEndStr, page: 1 }));
                        break;
                      case 'all':
                      default:
                        setFilters(prev => ({ ...prev, date_from: undefined, date_to: undefined, page: 1 }));
                        break;
                    }
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="tomorrow">Demain</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="week">Cette semaine</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setFilters({ per_page: 20, page: 1, sort_by: 'created_at', sort_order: 'desc' })}
                  className="whitespace-nowrap border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white transition-all duration-300"
                >
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table des contacts */}
          <Card className="border border-slate-200 bg-gradient-card shadow-premium">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-brand-black flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-blue" />
                Contacts ({totalContacts})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-brand-black font-medium">Aucun contact trouvé</p>
                  <p className="text-sm">Ajustez vos filtres pour voir plus de résultats</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Sujet</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">
                                {contact.first_name ? `${contact.first_name} ${contact.name}` : contact.name || 'Nom non fourni'}
                              </p>
                              {contact.email && (
                                <p className="text-sm text-text-secondary flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </p>
                              )}
                              {contact.phone && (
                                <p className="text-sm text-text-secondary flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">
                                {contact.subject || 'Pas de sujet'}
                              </p>
                              {contact.message && (
                                <p className="text-sm text-text-secondary truncate max-w-xs">
                                  {contact.message.substring(0, 50)}...
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-brand-black">
                                {new Date(contact.created_at).toLocaleDateString('fr-FR')}
                              </p>
                              <p className="text-sm text-text-secondary">
                                {new Date(contact.created_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(contact.status)}
                          </TableCell>
                          <TableCell>
                            {getSourceBadge(contact.source)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetails(contact)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openStatusUpdate(contact)}>
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Changer statut
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="text-red-600 focus:text-red-600"
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

          {/* Pagination */}
          {totalContacts > filters.per_page! && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                  className="border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white disabled:opacity-50"
                >
                  Précédent
                </Button>
                <span className="flex items-center px-4 text-sm text-text-secondary">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={contacts.length < filters.per_page!}
                  onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                  className="border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white disabled:opacity-50"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>

      {/* Dialog Détails */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl border border-slate-200 bg-gradient-card">
          <DialogHeader className="border-b border-slate-200 pb-4">
            <DialogTitle className="text-brand-black flex items-center gap-2">
              <Mail className="h-5 w-5 text-brand-blue" />
              Détails du contact
            </DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-brand-black">Nom</Label>
                  <p className="text-sm text-text-secondary">{selectedContact.name || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-brand-black">Prénom</Label>
                  <p className="text-sm text-text-secondary">{selectedContact.first_name || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-slate-600">{selectedContact.email || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Téléphone</Label>
                  <p className="text-sm text-slate-600">{selectedContact.phone || 'Non fourni'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Statut</Label>
                  <div className="mt-1">{getStatusBadge(selectedContact.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p className="text-sm text-slate-600">{new Date(selectedContact.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Sujet</Label>
                <p className="text-sm text-slate-600 mt-1">{selectedContact.subject || 'Pas de sujet'}</p>
              </div>

              {selectedContact.message && (
                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{selectedContact.message}</p>
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
              <Label htmlFor="status">Nouveau statut</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="read">Lu</SelectItem>
                  <SelectItem value="replied">Répondu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="note">Note (optionnelle)</Label>
              <Textarea
                id="note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Note sur le changement de statut..."
                rows={3}
              />
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
    </motion.div>
  );
};

const ContactDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <ContactDashboardContent />
    </DashboardLayout>
  );
};

export default ContactDashboard;