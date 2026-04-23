import { useState, useEffect } from 'react';
import { X, AlertCircle, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'beta_banner_dismissed';
const DAYS_BEFORE_REAPPEAR = 7;

export function BetaBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissedData = localStorage.getItem(STORAGE_KEY);
    if (dismissedData) {
      const { timestamp } = JSON.parse(dismissedData);
      const daysSinceDismissed = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

      if (daysSinceDismissed >= DAYS_BEFORE_REAPPEAR) {
        setIsVisible(true);
      }
    } else {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }));
    setIsVisible(false);
  };

  const handleReportBug = () => {
    navigate('/dashboard/tickets?source=beta_feedback');
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-sm">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-xs font-medium whitespace-nowrap">
        App en Beta - Aidez-nous !
      </span>
      <Button
        onClick={handleReportBug}
        size="sm"
        variant="secondary"
        className="h-6 px-2 py-0 text-xs bg-white text-orange-600 hover:bg-orange-50"
      >
        <Bug className="h-3 w-3 mr-1" />
        Signaler
      </Button>
      <button
        onClick={handleDismiss}
        className="p-0.5 hover:bg-white/20 rounded transition-colors"
        aria-label="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
