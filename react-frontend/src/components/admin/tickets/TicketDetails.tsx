

// src/components/admin/tickets/TicketDetails.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket as TicketIcon, Trash2, UserCheck, ChevronDown, History, Clock } from 'lucide-react';
import ClientInfo from './ClientInfo';
import Messages from './Messages';
import ReplyForm from './ReplyForm';
import type { Ticket } from '@/models/Ticket';
import { useDeleteAdminTicket } from '@/hooks/useAdminDeleteTicket';
import api from '@/services/api';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface Props {
  selectedTicket: Ticket | null;
  getStatusColor: (s: Ticket['status']) => string;
  getStatusIcon: (s: Ticket['status']) => JSX.Element | null;
}

interface HistoryEntry {
  id: number;
  action: string;
  action_label: string;
  description: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  created_at_human: string;
}

// ✅ Composant inline pour éviter un nouveau fichier
const TicketHistory: React.FC<{ ticketId: number }> = ({ ticketId }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/tickets/${ticketId}/history`);
      setHistory(Array.isArray(response.data) ? response.data : response.data.history || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && history.length === 0) {
      fetchHistory();
    }
  }, [isOpen, ticketId]);

  return (
    <div className="border-t pt-4 mt-4">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 mb-3"
      >
        <History className="h-4 w-4" />
        Historique des modifications ({history.length})
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              Chargement de l'historique...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Aucune modification enregistrée
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{entry.action_label}</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.user.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{entry.description}</p>
                    <p className="text-xs text-gray-500">{entry.created_at_human}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TicketDetails: React.FC<Props> = ({
  selectedTicket,
  getStatusColor,
  getStatusIcon,
}) => {
  const deleteTx = useDeleteAdminTicket();
  const [open, setOpen] = useState(false);
  
  // ✅ État pour l'assignation
  const [admins, setAdmins] = useState<Array<{id: number; name: string; email: string}>>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // ✅ Charger la liste des admins
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const response = await api.get('/admin/tickets/admins');
        setAdmins(response.data);
      } catch (error) {
        console.error('Erreur chargement admins:', error);
      }
    };

    fetchAdmins();
  }, []);

  // ✅ Fonction d'assignation
  const assignTicket = async (adminId: number | null) => {
    if (!selectedTicket) return;
    
    setAssignLoading(true);
    try {
      await api.post(`/admin/tickets/${selectedTicket.id}/assign`, {
        admin_id: adminId
      });
      
      toast({
        title: "Assignation mise à jour",
        description: "Le ticket a été assigné avec succès.",
      });
      // Idéalement, on rechargerait les données ici
      window.location.reload(); // Solution simple
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible d'assigner le ticket.",
        variant: "destructive",
      });
    } finally {
      setAssignLoading(false);
    }
  };

  if (!selectedTicket) {
    return (
      <Card>
        <CardContent className="py-20">
          <div className="text-center text-gray-500">
            <TicketIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Sélectionnez un ticket</h3>
            <p>Cliquez sur un ticket pour voir ses détails.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onConfirm = () => {
    deleteTx.mutate(selectedTicket.id, {
      onSuccess: () =>
        toast({
          title: 'Ticket supprimé',
          description: `Le ticket #${selectedTicket.id} a été supprimé.`,
        }),
      onError: (e) =>
        toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{selectedTicket.title}</CardTitle>
            <CardDescription>
              Ticket #{selectedTicket.id} • Créé le{' '}
              {new Date(selectedTicket.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(selectedTicket.status)}>
              {getStatusIcon(selectedTicket.status)}
              {selectedTicket.status}
            </Badge>
            
            {/* ✅ Dropdown assignation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={assignLoading}
                  className="flex items-center gap-1"
                >
                  <UserCheck className="h-4 w-4" />
                  {selectedTicket.assigned_admin ? selectedTicket.assigned_admin.name : 'Non assigné'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1 text-xs font-medium text-gray-500">
                  Assigner à :
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => assignTicket(null)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Non assigné
                </DropdownMenuItem>
                {admins.map((admin) => (
                  <DropdownMenuItem
                    key={admin.id}
                    onClick={() => assignTicket(admin.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      selectedTicket.assigned_to === admin.id ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{admin.name}</div>
                      <div className="text-xs text-gray-500">{admin.email}</div>
                    </div>
                    {selectedTicket.assigned_to === admin.id && (
                      <span className="text-xs text-blue-600">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <h3>Confirmer la suppression</h3>
                </DialogHeader>
                <p>Voulez-vous vraiment supprimer le ticket #{selectedTicket.id} ?</p>
                <DialogFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleteTx.isPending ? 'Suppression…' : 'Supprimer'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ClientInfo selectedTicket={selectedTicket} />
        <Messages selectedTicket={selectedTicket} />
        {selectedTicket.status !== 'resolved' && (
          <ReplyForm ticketId={selectedTicket.id} />
        )}
        
        {/* ✅ Nouvel onglet Historique */}
        <TicketHistory ticketId={selectedTicket.id} />
      </CardContent>
    </Card>
  );
};

export default TicketDetails;
