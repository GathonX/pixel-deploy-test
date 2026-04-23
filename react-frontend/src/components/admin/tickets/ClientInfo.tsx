
// src/components/admin/tickets/ClientInfo.tsx
import React from "react";
import { User, Calendar } from "lucide-react";
import type { Ticket } from "@/models/Ticket";

interface ClientInfoProps {
  selectedTicket: Ticket;
}

const ClientInfo: React.FC<ClientInfoProps> = ({ selectedTicket }) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-gray-50">
      <div>
        <div className="text-sm text-gray-500">Client</div>
        <div className="font-medium flex items-center">
          <User className="h-4 w-4 mr-1 text-gray-500" />
          {selectedTicket.user.name}
        </div>
        <div className="text-sm">{selectedTicket.user.email}</div>
      </div>
      <div>
        <div className="text-sm text-gray-500">Détails</div>
        <div className="font-medium flex items-center">
          <Calendar className="h-4 w-4 mr-1 text-gray-500" />
          {new Date(selectedTicket.updated_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="text-sm">Dernière mise à jour</div>
      </div>
    </div>
  );
};

export default ClientInfo;