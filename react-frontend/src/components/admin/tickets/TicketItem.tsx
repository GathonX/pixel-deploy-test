
// src/components/admin/tickets/TicketItem.tsx
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Ticket as TicketIcon, Trash2 } from 'lucide-react';
import type { Ticket } from '@/models/Ticket';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeleteAdminTicket } from '@/hooks/useAdminDeleteTicket';
import { toast } from '@/components/ui/use-toast';

interface Props {
  ticket: Ticket;
  selectedTicket: Ticket | null;
  setSelectedTicket: (t: Ticket | null) => void;
  getStatusColor: (s: Ticket['status']) => string;
  getStatusIcon: (s: Ticket['status']) => JSX.Element | null;
}

const TicketItem: React.FC<Props> = ({
  ticket, selectedTicket, setSelectedTicket,
  getStatusColor, getStatusIcon,
}) => {
  const deleteTx = useDeleteAdminTicket();
  const [open, setOpen] = useState(false);

  const onConfirm = () => {
    deleteTx.mutate(ticket.id, {
      onSuccess: () => {
        toast({ title: 'Ticket supprimé', description: `#${ticket.id}` });
        if (selectedTicket?.id === ticket.id) setSelectedTicket(null);
      },
      onError: (e) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
    });
    setOpen(false);
  };

  return (
    <>
      <div
        onClick={() => setSelectedTicket(ticket)}
        className={`p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-start ${
          selectedTicket?.id === ticket.id ? 'bg-gray-100' : ''
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5" /><span>{ticket.title}</span>
          </div>
          <small className="text-gray-500">{ticket.user.name}</small>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(ticket.status)}>
            {getStatusIcon(ticket.status)}{ticket.status}
          </Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-600"/></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><h3>Supprimer ?</h3></DialogHeader>
              <p>Confirmez la suppression du ticket #{ticket.id}.</p>
              <DialogFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={onConfirm} className="bg-red-600 text-white">
                  {deleteTx.isPending ? 'Suppression…' : 'Supprimer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default TicketItem;
