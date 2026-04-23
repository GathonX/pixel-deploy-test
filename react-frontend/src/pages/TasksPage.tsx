// src/pages/TasksPage.tsx — Gestion des tâches du site (Plan Pro)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckSquare, Plus, Search, Trash2, Edit2,
  Clock, CheckCircle2, AlertCircle, User, Calendar, Lock, Zap
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { PlatformProvider, usePlatform } from '@/components/site-builder/src/contexts/PlatformContext';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';
import type { WorkspaceMember } from '@/services/workspaceService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssignedTo { id: number; name: string; email: string; }

interface SiteTask {
  id: number;
  site_id: string;
  title: string;
  description: string | null;
  type: string;
  priority: 'high' | 'medium' | 'low' | 'normal';
  status: 'pending' | 'todo' | 'in-progress' | 'completed';
  scheduled_date: string | null;
  completed_at: string | null;
  order: number;
  assigned_to: AssignedTo | null;
  created_at: string;
}

interface TaskStats {
  total: number; pending: number; in_progress: number; completed: number; urgent: number;
}

interface TaskFormData {
  title: string; description: string; priority: string;
  status: string; scheduled_date: string; assigned_to_id: string;
}

const defaultForm: TaskFormData = {
  title: '', description: '', priority: 'normal',
  status: 'pending', scheduled_date: '', assigned_to_id: '',
};

const PRIORITY_LABELS: Record<string, string> = { high: 'Urgente', medium: 'Normale', normal: 'Normale', low: 'Basse' };
const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};
const STATUS_LABELS: Record<string, string> = { pending: 'En attente', todo: 'À faire', 'in-progress': 'En cours', completed: 'Terminée' };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  todo: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

// ─── TaskModal ────────────────────────────────────────────────────────────────

function TaskModal({ siteId, task, members, onClose, onSaved }: {
  siteId: string; task: SiteTask | null; members: WorkspaceMember[];
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<TaskFormData>(
    task ? {
      title: task.title, description: task.description ?? '',
      priority: task.priority, status: task.status,
      scheduled_date: task.scheduled_date ?? '',
      assigned_to_id: task.assigned_to ? String(task.assigned_to.id) : '',
    } : defaultForm
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority, status: form.status,
        scheduled_date: form.scheduled_date || null,
        assigned_to_id: form.assigned_to_id ? Number(form.assigned_to_id) : null,
      };
      if (task) {
        await api.put(`/site-builder/sites/${siteId}/tasks/${task.id}`, payload);
      } else {
        await api.post(`/site-builder/sites/${siteId}/tasks`, payload);
      }
      toast({ title: task ? 'Tâche mise à jour.' : 'Tâche créée.' });
      onSaved();
      onClose();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la tâche.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titre de la tâche…" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnelle)…" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Urgente</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">À faire</SelectItem>
                  <SelectItem value="in-progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Date prévue</Label>
            <Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
          </div>
          {members.length > 0 && (
            <div>
              <Label>Assigner à</Label>
              <Select value={form.assigned_to_id} onValueChange={v => setForm(f => ({ ...f, assigned_to_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un membre…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Non assigné</SelectItem>
                  {members.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving} className="bg-lime-600 hover:bg-lime-700 text-white">
              {saving ? 'Sauvegarde…' : task ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onEdit, onDelete, onStatusChange }: {
  task: SiteTask; onEdit: (t: SiteTask) => void;
  onDelete: (id: number) => void; onStatusChange: (id: number, status: string) => void;
}) {
  const nextStatus = task.status === 'pending' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : 'pending';
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <button onClick={() => onStatusChange(task.id, nextStatus)} className="mt-0.5 shrink-0">
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : task.status === 'in-progress' ? (
          <Clock className="w-5 h-5 text-blue-500" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/40" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
        {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</Badge>
          <Badge className={`text-xs border-0 ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</Badge>
          {task.scheduled_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />{new Date(task.scheduled_date).toLocaleDateString('fr-FR')}
            </span>
          )}
          {task.assigned_to && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" />{task.assigned_to.name}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(task)}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── TasksPageContent ─────────────────────────────────────────────────────────

function TasksPageContent({ initialSiteId }: { initialSiteId?: string }) {
  const { setOpenMobile } = useSidebar();
  const { toast } = useToast();
  const { sites } = usePlatform();

  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(initialSiteId);
  const [siteNeedsPro, setSiteNeedsPro] = useState(false);

  // Auto-select first Pro site (effective_plan_key === 'pro')
  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      const proSite = sites.find(s => s.effectivePlanKey === 'pro');
      setSelectedSiteId(proSite?.id ?? sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const siteId = selectedSiteId;

  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, pending: 0, in_progress: 0, completed: 0, urgent: 0 });
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SiteTask | null>(null);

  const loadTasks = useCallback(async (sid: string) => {
    setLoading(true);
    setSiteNeedsPro(false);
    try {
      const res = await api.get(`/site-builder/sites/${sid}/tasks`);
      setTasks(res.data.data ?? []);
      setStats(res.data.stats ?? { total: 0, pending: 0, in_progress: 0, completed: 0, urgent: 0 });
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setSiteNeedsPro(true);
        setTasks([]);
      } else {
        toast({ title: 'Erreur', description: 'Impossible de charger les tâches.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!siteId || siteNeedsPro) return;
    api.get(`/site-builder/sites/${siteId}/tasks/members`)
      .then(res => setMembers(res.data.data ?? []))
      .catch(() => {});
  }, [siteId, siteNeedsPro]);
  useEffect(() => { if (siteId) loadTasks(siteId); }, [siteId, loadTasks]);

  const handleDelete = async (id: number) => {
    if (!siteId || !confirm('Supprimer cette tâche ?')) return;
    try {
      await api.delete(`/site-builder/sites/${siteId}/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast({ title: 'Tâche supprimée.' });
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    if (!siteId) return;
    try {
      const res = await api.patch(`/site-builder/sites/${siteId}/tasks/${id}/status`, { status });
      setTasks(prev => prev.map(t => t.id === id ? res.data.data : t));
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SidebarInset>
      <header className="flex h-16 items-center gap-4 px-6 border-b bg-background shrink-0">
        <button className="md:hidden p-2 rounded-md hover:bg-accent" onClick={() => setOpenMobile(true)}>
          <CheckSquare className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <CheckSquare className="w-5 h-5 text-lime-500" />
          <h1 className="text-lg font-semibold">Tâches</h1>
        </div>
        {sites.length > 1 && (
          <Select value={siteId ?? ''} onValueChange={v => { setSelectedSiteId(v); setSiteNeedsPro(false); }}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Choisir un site…" /></SelectTrigger>
            <SelectContent>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.effectivePlanKey === 'pro' ? ' — Pro' : ' — Starter'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={() => { setEditingTask(null); setModalOpen(true); }} className="gap-2 bg-lime-600 hover:bg-lime-700 text-white">
          <Plus className="w-4 h-4" />Nouvelle tâche
        </Button>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: <CheckSquare className="w-4 h-4" />, color: 'text-lime-600' },
            { label: 'En cours', value: stats.in_progress, icon: <Clock className="w-4 h-4" />, color: 'text-blue-600' },
            { label: 'Terminées', value: stats.completed, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600' },
            { label: 'Urgentes', value: stats.urgent, icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className={`flex items-center gap-1.5 ${s.color} mb-1`}>{s.icon}<p className="text-xs text-muted-foreground">{s.label}</p></div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une tâche…" className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="pending">À faire</SelectItem>
              <SelectItem value="in-progress">En cours</SelectItem>
              <SelectItem value="completed">Terminées</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priorité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              <SelectItem value="high">Urgente</SelectItem>
              <SelectItem value="normal">Normale</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upgrade prompt si site Starter */}
        {siteNeedsPro && siteId && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Lock className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Ce site est sur le plan Starter</p>
                <p className="text-sm text-amber-700 mt-1 max-w-sm">
                  La gestion des tâches est disponible avec le plan <strong>Pro (120 000 Ar/mois)</strong> par site.
                  Passez ce site en Pro pour débloquer les tâches, fournisseurs, IA et plus.
                </p>
              </div>
              <button
                onClick={() => window.location.href = `/dashboard/site/${siteId}/billing`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Passer ce site en Pro
              </button>
            </CardContent>
          </Card>
        )}

        {/* Liste */}
        {!siteNeedsPro && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {filtered.length} tâche{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!siteId ? (
              <p className="text-center text-muted-foreground py-8">Sélectionnez un site pour voir ses tâches.</p>
            ) : loading ? (
              <p className="text-center text-muted-foreground py-8">Chargement…</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-lime-50 flex items-center justify-center">
                  <CheckSquare className="w-8 h-8 text-lime-400" />
                </div>
                <div>
                  <p className="font-semibold">Aucune tâche</p>
                  <p className="text-sm text-muted-foreground mt-1">Créez des tâches, assignez-les à votre équipe et suivez leur avancement.</p>
                </div>
                <Button onClick={() => { setEditingTask(null); setModalOpen(true); }} className="gap-2 bg-lime-600 hover:bg-lime-700 text-white">
                  <Plus className="w-4 h-4" />Créer ma première tâche
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(task => (
                  <TaskRow
                    key={task.id} task={task}
                    onEdit={t => { setEditingTask(t); setModalOpen(true); }}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

      </div>

      {modalOpen && siteId && !siteNeedsPro && (
        <TaskModal
          siteId={siteId} task={editingTask} members={members}
          onClose={() => setModalOpen(false)}
          onSaved={() => loadTasks(siteId)}
        />
      )}
    </SidebarInset>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

function PlanGateUpgrade({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-violet-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-sm mb-6">{description}</p>
      <button
        onClick={() => navigate('/billing')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors"
      >
        <Zap className="w-4 h-4" />
        Passer au plan Pro
      </button>
    </div>
  );
}

export default function TasksPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { workspace } = useWorkspace();
  // Tâches globales = fonctionnalité ENTREPRISE (plan_key='premium') uniquement — OFFER.md
  const isEntreprise = workspace?.plan_key === 'premium';

  return (
    <PlatformProvider>
      <WorkspaceLayout>
        {!isEntreprise && workspace ? (
          <PlanGateUpgrade
            title="Tâches & Organisation — Plan Agence"
            description="La gestion des tâches globales est réservée au plan Agence. Passez à Agence pour gérer les tâches de votre équipe, assigner des tâches liées aux réservations et organiser votre travail."
          />
        ) : (
          <TasksPageContent initialSiteId={siteId} />
        )}
      </WorkspaceLayout>
    </PlatformProvider>
  );
}
