import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';

export function WorkspaceSuspendedBanner() {
  const { workspace, isSuspended, isTrialExpired } = useWorkspace();

  if (!workspace) return null;
  if (!isSuspended && !isTrialExpired) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {isSuspended
              ? 'Nous sommes ravis de vous revoir ! Pour réactiver votre compte PixelRise, veuillez cliquer sur "Je me réabonne".'
              : 'Votre période d\'essai est terminée. Abonnez-vous pour continuer à publier vos sites.'}
          </p>
        </div>
        <Link
          to="/billing"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Je me réabonne
        </Link>
      </div>
    </div>
  );
}
