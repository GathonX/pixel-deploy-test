import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { workspaceService } from '@/services/workspaceService';
import { setActiveWorkspaceId } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Zap, Globe, ChevronDown, Check, Building2, Plus } from 'lucide-react';

type OwnedWs = {
  id: string;
  name: string;
  status: string;
  is_delivered: boolean;
  plan_key: string | null;
  sites_count: number;
};

export function WorkspacePlanBadge() {
  const { workspace, isLoading } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<OwnedWs[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Charger les workspaces au premier clic
  const handleToggle = () => {
    if (!open && workspaces.length === 0) {
      workspaceService.getOwnerWorkspaces()
        .then(list => setWorkspaces(list.filter(w => !w.is_delivered)))
        .catch(() => {});
    }
    setOpen(prev => !prev);
  };

  const handleSelect = (wsId: string) => {
    setOpen(false);
    setActiveWorkspaceId(wsId);
    navigate(`/workspace/${wsId}`);
    window.location.reload();
  };

  if (isLoading || !workspace) return null;

  const planLabel = workspaceService.getPlanLabel(workspace.plan_key);
  const planColor  = workspaceService.getPlanColor(workspace.plan_key);

  return (
    <div ref={ref} className="relative mx-2 mb-2">
      {/* Trigger */}
      <button
        onClick={handleToggle}
        className="w-full p-2 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
              {workspace.name}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${planColor}`}>
              {planLabel}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
          <Zap className="w-3 h-3" />
          <span>{workspace.published_sites_count}/{workspace.max_published_sites} sites publiés</span>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Mes workspaces
          </p>

          {workspaces.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">Chargement...</div>
          ) : (
            workspaces.map(ws => {
              const isCurrent = String(ws.id) === String(workspace.id);
              const label = workspaceService.getPlanLabel(ws.plan_key);
              const color = workspaceService.getPlanColor(ws.plan_key);
              return (
                <button
                  key={ws.id}
                  onClick={() => handleSelect(ws.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    isCurrent ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <span className="flex-1 truncate font-medium text-xs">{ws.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                </button>
              );
            })
          )}

          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => { setOpen(false); navigate('/workspace/settings'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 text-left"
          >
            <Plus className="w-3.5 h-3.5" />
            Gérer les workplaces
          </button>
        </div>
      )}
    </div>
  );
}
