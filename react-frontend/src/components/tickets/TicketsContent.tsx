import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserTickets, useCreateTicket } from '@/hooks/useTickets';
import NewTicketDialog from './NewTicketDialog';
import TicketList from './TicketList';
import TicketDetailsDialog from './TicketDetailsDialog';
import { AlertCircle, Clock, CheckCircle2, Play, HelpCircle, ArrowUp } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import type { Ticket } from '@/models/Ticket';

const TicketsContent: React.FC = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId?: string }>();
  const openTicketId = ticketId ? Number(ticketId) : undefined;

  const { data: tickets = [], isLoading, error } = useUserTickets();
  const { mutate: createTicket, isPending: isCreating } = useCreateTicket();

  const [activeTab, setActiveTab] = useState<'all' | Ticket['status']>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // pré-ouverture par URL + redirection si l’ID n’existe pas
  useEffect(() => {
    if (openTicketId != null && tickets.length > 0) {
      const t = tickets.find(t => t.id === openTicketId);
      if (t) {
        setSelectedTicket(t);
      } else {
        navigate('/dashboard/tickets', { replace: true });
      }
    }
  }, [openTicketId, tickets, navigate]);

  // gestion création
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    category: 'Authentification' as string,
  });
  const [newTicketImage, setNewTicketImage] = useState<File | null>(null);
  const [newTicketImagePreview, setNewTicketImagePreview] = useState<string | null>(null);
  const newTicketFileInputRef = useRef<HTMLInputElement>(null);

  const getStatusColor = (s: Ticket['status']) => {
    const colorMap = {
      open: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      resolved: 'bg-green-100 text-green-800 hover:bg-green-200',
      in_progress: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      waiting_info: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      escalated: 'bg-red-100 text-red-800 hover:bg-red-200',
    };
    return colorMap[s] || 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };

  const getStatusIcon = (s: Ticket['status']) => {
    const iconMap = {
      open: <AlertCircle className="h-4 w-4 mr-1" />,
      pending: <Clock className="h-4 w-4 mr-1" />,
      resolved: <CheckCircle2 className="h-4 w-4 mr-1" />,
      in_progress: <Play className="h-4 w-4 mr-1" />,
      waiting_info: <HelpCircle className="h-4 w-4 mr-1" />,
      escalated: <ArrowUp className="h-4 w-4 mr-1" />,
    };
    return iconMap[s] || <AlertCircle className="h-4 w-4 mr-1" />;
  };

  const statusLabels: Record<Ticket['status'], string> = {
    open: 'Ouvert',
    pending: 'En attente',
    resolved: 'Résolu',
    in_progress: 'En cours de traitement',
    waiting_info: 'Attente informations',
    escalated: 'Escaladé',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-20 text-red-600">
        Erreur lors du chargement des tickets.
      </div>
    );
  }

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes tickets de support</h1>
        <NewTicketDialog
          newTicketOpen={newTicketOpen}
          setNewTicketOpen={setNewTicketOpen}
          newTicket={newTicket}
          setNewTicket={setNewTicket}
          newTicketImage={newTicketImage}
          setNewTicketImage={setNewTicketImage}
          newTicketImagePreview={newTicketImagePreview}
          setNewTicketImagePreview={setNewTicketImagePreview}
          newTicketFileInputRef={newTicketFileInputRef}
          createTicket={createTicket}
          isCreating={isCreating}
        />
      </div>

      <TicketList
        tickets={tickets}
        activeTab={activeTab}
        setActiveTab={tab => setActiveTab(tab as 'all' | Ticket['status'])}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setSelectedTicket={setSelectedTicket}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        statusLabels={statusLabels}
      />

      <TicketDetailsDialog
        selectedTicket={selectedTicket}
        setSelectedTicket={setSelectedTicket}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        statusLabels={statusLabels}
      />
    </div>
  );
};

export default TicketsContent;
