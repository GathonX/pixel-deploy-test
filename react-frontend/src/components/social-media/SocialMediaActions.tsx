import React from "react";
import { CalendarDays } from "lucide-react";

interface SocialMediaActionsProps {
  onGoToCalendar: () => void;
}

export const SocialMediaActions: React.FC<SocialMediaActionsProps> = ({
  onGoToCalendar
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <button 
        onClick={onGoToCalendar}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
      >
        <CalendarDays className="h-4 w-4" />
        Voir le calendrier de publication
      </button>
    </div>
  );
};