import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import {
  Plus, Trash2, Edit2, X, Upload, User, Flag,
  AlertCircle, Clock, CheckCircle2, Loader2, ImageIcon, Calendar, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { toast } from "sonner";
import api from "@/services/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "normal" | "low";
type Status   = "pending" | "todo" | "in-progress" | "completed";

interface Member { id: number; name: string; email: string; role: string; }

interface Task {
  id: number;
  site_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  scheduled_date: string | null;
  image_url: string | null;
  type: string | null;
  reservation_id: number | null;
  assigned_to: { id: number; name: string; email: string } | null;
  created_at: string;
}

type TaskForm = {
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  scheduled_date: string;
  assigned_to_id: string;
  image: File | null;
  remove_image: boolean;
};

const DEFAULT_FORM: TaskForm = {
  title: "", description: "", priority: "normal", status: "pending",
  scheduled_date: "", assigned_to_id: "", image: null, remove_image: false,
};

// ─── Week helpers ─────────────────────────────────────────────────────────────

const DAYS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
}

function todayIndex(): number {
  const dow = new Date().getDay();
  return dow === 0 ? 6 : dow - 1;
}

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: { id: Status; label: string; headerCls: string; icon: React.ReactNode }[] = [
  { id: "pending",     label: "En attente", headerCls: "text-slate-500 border-slate-200 bg-slate-50",  icon: <Clock        className="w-3.5 h-3.5" /> },
  { id: "todo",        label: "À faire",    headerCls: "text-amber-600 border-amber-200 bg-amber-50",  icon: <AlertCircle  className="w-3.5 h-3.5" /> },
  { id: "in-progress", label: "En cours",   headerCls: "text-blue-600  border-blue-200  bg-blue-50",   icon: <Flag         className="w-3.5 h-3.5" /> },
  { id: "completed",   label: "Terminé",    headerCls: "text-green-600 border-green-200 bg-green-50",  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

const PRIORITY_LABELS: Record<Priority, string> = { high: "Urgent", medium: "Important", normal: "Normal", low: "Faible" };
const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-500", medium: "bg-amber-500", normal: "bg-slate-400", low: "bg-green-500",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SprintViewPage() {
  const [searchParams] = useSearchParams();
  const siteId = searchParams.get("siteId");

  const weekDates  = getWeekDates();
  const [activeDay, setActiveDay] = useState(todayIndex());

  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [members,  setMembers]  = useState<Member[]>([]);
  const [siteName, setSiteName] = useState("");
  const [loading,  setLoading]  = useState(true);

  // Drag state
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  // Modal
  const [modalOpen,  setModalOpen]  = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [editMode,   setEditMode]   = useState(false);
  const [form,       setForm]       = useState<TaskForm>(DEFAULT_FORM);
  const [saving,     setSaving]     = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!siteId) { setLoading(false); return; }
    Promise.all([
      api.get(`/site-builder/sites/${siteId}/tasks`),
      api.get(`/site-builder/sites/${siteId}/tasks/members`),
      api.get(`/site-builder/sites/${siteId}`),
    ]).then(([t, m, s]) => {
      setTasks(t.data?.data ?? []);
      setMembers(m.data?.data ?? []);
      setSiteName(s.data?.data?.name ?? "");
    }).catch(() => toast.error("Erreur de chargement")).finally(() => setLoading(false));
  }, [siteId]);

  // ── Assignee filter ───────────────────────────────────────────────────────

  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);

  // All members (show all in filter, not just those with tasks)
  const assigneesWithTasks = members;

  // ── Filtered tasks for active day ─────────────────────────────────────────

  const dayDate = weekDates[activeDay];
  const dayTasks = tasks.filter(t => {
    if (t.scheduled_date !== dayDate) return false;
    if (assigneeFilter !== null && t.assigned_to?.id !== assigneeFilter) return false;
    return true;
  });
  const taskCount = (status: Status) => dayTasks.filter(t => t.status === status).length;

  // ── CRUD helpers ──────────────────────────────────────────────────────────

  const openCreate = (status: Status = "pending") => {
    setDetailTask(null); setEditMode(false);
    setForm({ ...DEFAULT_FORM, status, scheduled_date: dayDate });
    setModalOpen(true);
  };

  const openDetail = (task: Task) => {
    setDetailTask(task); setEditMode(false); setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setDetailTask(task); setEditMode(true);
    setForm({
      title: task.title, description: task.description ?? "",
      priority: task.priority, status: task.status,
      scheduled_date: task.scheduled_date ?? dayDate,
      assigned_to_id: task.assigned_to?.id.toString() ?? "",
      image: null, remove_image: false,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setDetailTask(null); setEditMode(false); setForm(DEFAULT_FORM); };

  const handleSave = async () => {
    if (!form.title.trim() || !siteId) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title",       form.title.trim());
      fd.append("description", form.description);
      fd.append("priority",    form.priority);
      fd.append("status",      form.status);
      fd.append("scheduled_date", form.scheduled_date || dayDate);
      if (form.assigned_to_id) fd.append("assigned_to_id", form.assigned_to_id);
      if (form.image)          fd.append("image", form.image);
      if (form.remove_image)   fd.append("remove_image", "1");

      if (detailTask && editMode) {
        fd.append("_method", "PUT");
        const res = await api.post(`/site-builder/sites/${siteId}/tasks/${detailTask.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setTasks(prev => prev.map(t => t.id === res.data.data.id ? res.data.data : t));
        toast.success("Tâche mise à jour");
      } else {
        const res = await api.post(`/site-builder/sites/${siteId}/tasks`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setTasks(prev => [...prev, res.data.data]);
        toast.success("Tâche créée");
      }
      closeModal();
    } catch { toast.error("Erreur lors de la sauvegarde"); }
    finally   { setSaving(false); }
  };

  const handleDelete = async (task: Task) => {
    if (!siteId || !confirm(`Supprimer « ${task.title} » ?`)) return;
    await api.delete(`/site-builder/sites/${siteId}/tasks/${task.id}`).catch(() => null);
    setTasks(prev => prev.filter(t => t.id !== task.id));
    closeModal();
    toast.success("Tâche supprimée");
  };

  const handleStatusChange = async (taskId: number, status: Status) => {
    if (!siteId) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    await api.patch(`/site-builder/sites/${siteId}/tasks/${taskId}/status`, { status })
      .catch(() => toast.error("Erreur changement statut"));
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const onDragStart = (e: DragStartEvent) => {
    const task = tasks.find(t => t.id === parseInt(e.active.id as string));
    setDraggingTask(task ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = e;
    if (!over) return;
    const colId = over.id as Status;
    if (!COLUMNS.find(c => c.id === colId)) return;
    const taskId = parseInt(active.id as string);
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== colId) handleStatusChange(taskId, colId);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!siteId) {
    return (
      <SidebarProvider>
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm">Accédez aux tâches depuis le sidebar d'un site.</p>
          </div>
        </DashboardLayout>
      </SidebarProvider>
    );
  }

  if (loading) {
    return (
      <SidebarProvider>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
          </div>
        </DashboardLayout>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <DashboardLayout>
        <div className="flex flex-col h-full">

          {/* ── Top header ── */}
          <div className="px-6 pt-5 pb-3 border-b bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold text-slate-800">Tâches</h1>
                {siteName && <p className="text-xs text-slate-400">{siteName}</p>}
              </div>
              <Button size="sm" onClick={() => openCreate()} className="gap-1.5">
                <Plus className="w-4 h-4" /> Nouvelle tâche
              </Button>
            </div>

            {/* Day tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {DAYS_FR.map((day, i) => {
                const isToday = i === todayIndex();
                const count   = tasks.filter(t => t.scheduled_date === weekDates[i]).length;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeDay === i
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isToday
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span>{day}{isToday ? " ★" : ""}</span>
                    <span className={`text-xs mt-0.5 ${activeDay === i ? "text-indigo-200" : "text-slate-400"}`}>
                      {new Date(weekDates[i]).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    {count > 0 && (
                      <span className={`text-xs rounded-full px-1.5 mt-0.5 font-semibold ${
                        activeDay === i ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Assignee filter */}
            {assigneesWithTasks.length > 0 && (
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                  <User className="w-3 h-3" /> Filtrer :
                </span>
                <button
                  onClick={() => setAssigneeFilter(null)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${
                    assigneeFilter === null
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tous
                </button>
                {assigneesWithTasks.map(m => {
                  const isActive = assigneeFilter === m.id;
                  const initials = m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={m.id}
                      onClick={() => setAssigneeFilter(isActive ? null : m.id)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all flex-shrink-0 border ${
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {initials}
                      </span>
                      {m.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Kanban ── */}
          <div className="flex-1 overflow-auto p-4">
            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="flex gap-4 h-full min-h-[400px]">
                {COLUMNS.map(col => (
                  <KanbanColumn
                    key={col.id}
                    col={col}
                    tasks={dayTasks.filter(t => t.status === col.id)}
                    count={taskCount(col.id)}
                    onAddClick={() => openCreate(col.id)}
                    onCardClick={openDetail}
                    onEditCard={openEdit}
                    onDeleteCard={handleDelete}
                  />
                ))}
              </div>
              <DragOverlay>
                {draggingTask && <TaskCard task={draggingTask} onClick={() => {}} overlay />}
              </DragOverlay>
            </DndContext>
          </div>
        </div>

        {/* ── Modal détail style Trello ── */}
        <Dialog open={modalOpen && !!(detailTask && !editMode)} onOpenChange={o => { if (!o) closeModal(); }}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only"><DialogTitle>Détail tâche</DialogTitle></DialogHeader>
            {detailTask && !editMode && (
              <DetailView
                task={detailTask}
                siteId={siteId ?? ''}
                members={members}
                onEdit={() => openEdit(detailTask)}
                onDelete={() => handleDelete(detailTask)}
                onStatusChange={s => {
                  handleStatusChange(detailTask.id, s);
                  setDetailTask(p => p ? { ...p, status: s } : null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ── Modal create / edit ── */}
        <Dialog open={modalOpen && (!detailTask || editMode)} onOpenChange={o => { if (!o) closeModal(); }}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailTask ? "Modifier la tâche" : "Nouvelle tâche"}</DialogTitle>
            </DialogHeader>
            <FormView
              form={form} setForm={setForm}
              members={members} imageInputRef={imageInputRef}
              saving={saving} isEdit={!!detailTask}
              existingImageUrl={editMode ? (detailTask?.image_url ?? null) : null}
              onSave={handleSave} onCancel={closeModal}
            />
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </SidebarProvider>
  );
}

// ─── KanbanColumn ──────────────────────────────────────────────────────────────

function KanbanColumn({ col, tasks, count, onAddClick, onCardClick, onEditCard, onDeleteCard }: {
  col: typeof COLUMNS[0]; tasks: Task[]; count: number;
  onAddClick: () => void; onCardClick: (t: Task) => void;
  onEditCard: (t: Task) => void; onDeleteCard: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col w-64 min-w-[240px] rounded-xl border bg-white shadow-sm">
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-b ${col.headerCls}`}>
        {col.icon}
        <span className="font-semibold text-sm">{col.label}</span>
        <Badge variant="outline" className="ml-auto text-xs h-5">{count}</Badge>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 space-y-2 min-h-[200px] transition-colors rounded-b-xl ${
          isOver ? "bg-indigo-50" : ""
        }`}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id} task={task}
            onClick={() => onCardClick(task)}
            onEdit={() => onEditCard(task)}
            onDelete={() => onDeleteCard(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-20 flex items-center justify-center text-xs text-slate-300 border-2 border-dashed border-slate-100 rounded-lg">
            Déposer ici
          </div>
        )}
      </div>

      {/* Add */}
      <div className="p-2 border-t">
        <button
          onClick={onAddClick}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter une tâche
        </button>
      </div>
    </div>
  );
}

// ─── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick, onEdit, onDelete, overlay = false }: {
  task: Task; onClick: () => void;
  onEdit?: () => void; onDelete?: () => void;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id.toString() });
  const dragMoved = useRef(false);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        dragMoved.current = false;
        (listeners as any).onPointerDown?.(e);
      }}
      onPointerMove={() => { dragMoved.current = true; }}
      onClick={() => { if (!dragMoved.current) onClick(); }}
      className={`relative group bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer select-none transition-all ${
        isDragging ? "opacity-30" : overlay ? "shadow-xl rotate-2 ring-2 ring-indigo-400 opacity-95" : "hover:shadow-md hover:border-slate-300"
      }`}
    >
      {/* Cover image */}
      {task.image_url && (
        <img
          src={task.image_url}
          alt=""
          draggable={false}
          className="w-full h-28 object-cover block"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}

      {/* MoreVertical menu — visible on hover */}
      {!overlay && (onEdit || onDelete) && (
        <div
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 bg-white/90 hover:bg-white rounded-md shadow-sm border border-slate-200">
                <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onClick}>
                <Flag className="w-3.5 h-3.5 mr-2 text-slate-400" /> Voir le détail
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-400" /> Modifier
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {task.type === 'reservation' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 mb-1.5">
            📅 Réservation
          </span>
        )}
        <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{task.title}</p>

        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
        )}

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
          <span className="text-xs text-slate-500">{PRIORITY_LABELS[task.priority]}</span>
          {task.scheduled_date && (
            <span className="text-xs text-slate-400 ml-1 flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.scheduled_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </span>
          )}
          {task.assigned_to && (
            <Avatar className="w-5 h-5 ml-auto flex-shrink-0">
              <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700">
                {task.assigned_to.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DetailView (style Trello) ────────────────────────────────────────────────

const STATUS_LABELS: Record<Status, string> = {
  pending: "En attente", todo: "À faire", "in-progress": "En cours", completed: "Terminé",
};
const STATUS_COLORS: Record<Status, string> = {
  pending: "bg-slate-100 text-slate-600",
  todo: "bg-amber-100 text-amber-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

function DetailView({ task, siteId, members, onEdit, onDelete, onStatusChange }: {
  task: Task; siteId: string; members: Member[];
  onEdit: () => void; onDelete: () => void; onStatusChange: (s: Status) => void;
}) {
  const reservationUrl = task.type === 'reservation'
    ? (task.reservation_id
        ? `/dashboard/site/${siteId}/reservations`
        : null)
    : null;
  return (
    <div className="flex flex-col">
      {/* Cover image — full width, no padding */}
      {task.image_url && (
        <div className="w-full h-48 bg-slate-100 flex-shrink-0">
          <img
            src={task.image_url}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex gap-0">
        {/* Left — main content */}
        <div className="flex-1 p-5 min-w-0">
          {task.type === 'reservation' && reservationUrl && (
            <a
              href={reservationUrl}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 mb-2 hover:bg-amber-100 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              📅 Réservation reçue — Voir le dashboard réservations →
            </a>
          )}
          <h2 className="text-lg font-bold text-slate-800 mb-1 leading-tight">{task.title}</h2>

          {task.scheduled_date && (
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.scheduled_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          )}

          {task.description ? (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic mb-4">Aucune description</p>
          )}
        </div>

        {/* Right sidebar — actions */}
        <div className="w-44 flex-shrink-0 p-4 border-l bg-slate-50 space-y-3">

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Statut</p>
            <Select value={task.status} onValueChange={v => onStatusChange(v as Status)}>
              <SelectTrigger className="h-7 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="todo">À faire</SelectItem>
                <SelectItem value="in-progress">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Priorité</p>
            <span className="flex items-center gap-1.5 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>

          {/* Assigned to */}
          {task.assigned_to && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assigné à</p>
              <div className="flex items-center gap-1.5">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                    {task.assigned_to.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-slate-700 truncate">{task.assigned_to.name}</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t pt-2 space-y-1.5">
            <Button size="sm" onClick={onEdit} className="w-full gap-1.5 justify-start" variant="outline">
              <Edit2 className="w-3.5 h-3.5" /> Modifier
            </Button>
            <Button size="sm" onClick={onDelete} className="w-full gap-1.5 justify-start" variant="destructive">
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FormView ──────────────────────────────────────────────────────────────────

function FormView({ form, setForm, members, imageInputRef, saving, isEdit, existingImageUrl, onSave, onCancel }: {
  form: TaskForm;
  setForm: React.Dispatch<React.SetStateAction<TaskForm>>;
  members: Member[];
  imageInputRef: React.RefObject<HTMLInputElement>;
  saving: boolean; isEdit: boolean;
  existingImageUrl?: string | null;
  onSave: () => void; onCancel: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null);

  useEffect(() => {
    setPreview(existingImageUrl ?? null);
  }, [existingImageUrl]);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setForm(p => ({ ...p, image: f, remove_image: false }));
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Titre *</Label>
        <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus />
      </div>

      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Description</Label>
        <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
      </div>

      {/* Image */}
      <div>
        <Label className="text-xs text-slate-500 mb-1 block">Image</Label>
        {preview ? (
          <div className="relative">
            <img src={preview} alt="" className="w-full h-28 object-cover rounded-lg" />
            <button type="button" onClick={() => { setPreview(null); setForm(p => ({ ...p, image: null, remove_image: true })); if (imageInputRef.current) imageInputRef.current.value = ""; }}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => imageInputRef.current?.click()}
            className="w-full h-16 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2 text-xs text-slate-400 hover:border-slate-300 transition-colors">
            <ImageIcon className="w-4 h-4" /> Ajouter une image
          </button>
        )}
        <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={handleImg} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Priorité</Label>
          <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as Priority }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">🔴 Urgent</SelectItem>
              <SelectItem value="medium">🟠 Important</SelectItem>
              <SelectItem value="normal">🔵 Normal</SelectItem>
              <SelectItem value="low">🟢 Faible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block">Statut</Label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Status }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="todo">À faire</SelectItem>
              <SelectItem value="in-progress">En cours</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-500 mb-1 block"><Calendar className="w-3 h-3 inline mr-1" />Date</Label>
          <Input type="date" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-1 block"><User className="w-3 h-3 inline mr-1" />Assigné à</Label>
          <Select value={form.assigned_to_id || "none"} onValueChange={v => setForm(p => ({ ...p, assigned_to_id: v === "none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Personne" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Personne —</SelectItem>
              {members.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={onSave} disabled={!form.title.trim() || saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
      </div>
    </div>
  );
}
