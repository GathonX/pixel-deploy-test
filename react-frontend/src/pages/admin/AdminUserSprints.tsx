import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/services/api";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Circle,
  ListTodo,
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  scheduled_date: string;
}

interface Sprint {
  id: number;
  title: string;
  description: string;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  tasks: Task[];
  project?: {
    id: number;
    name: string;
  };
}

interface Purchase {
  access_id: number;
  feature_name: string;
  status: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  sprints_count: number;
  sprints: Sprint[];
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

const AdminUserSprints: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<UserData | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccessId, setSelectedAccessId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSprintModalOpen, setDeleteSprintModalOpen] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [deletingSprint, setDeletingSprint] = useState(false);
  const [deleteDayModalOpen, setDeleteDayModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<{sprintId: number, date: string, tasksCount: number} | null>(null);
  const [deletingDay, setDeletingDay] = useState(false);

  useEffect(() => {
    fetchSprints();
  }, [userId]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}/sprints`);

      if (response.data.success) {
        setUser(response.data.data.user);
        setPurchases(response.data.data.purchases);
      }
    } catch (error: any) {
      console.error("Erreur récupération sprints:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les sprints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!selectedAccessId) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/admin/features/purchase/${selectedAccessId}`);

      if (response.data.success) {
        toast({
          title: "Achat supprimé",
          description: `${response.data.data.deleted_counts.sprints} sprints supprimés`,
        });

        // Rafraîchir la liste
        fetchSprints();
        setDeleteModalOpen(false);
      }
    } catch (error: any) {
      console.error("Erreur suppression achat:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'achat",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setSelectedAccessId(null);
    }
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprintId) return;

    try {
      setDeletingSprint(true);
      const response = await api.delete(`/admin/sprints/${selectedSprintId}`);

      if (response.data.success) {
        toast({
          title: "Sprint supprimé",
          description: "Le sprint a été supprimé avec succès",
        });

        // Rafraîchir la liste
        fetchSprints();
        setDeleteSprintModalOpen(false);
      }
    } catch (error: any) {
      console.error("Erreur suppression sprint:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le sprint",
        variant: "destructive",
      });
    } finally {
      setDeletingSprint(false);
      setSelectedSprintId(null);
    }
  };

  const handleDeleteDay = async () => {
    if (!selectedDayData) return;

    try {
      setDeletingDay(true);
      const response = await api.delete(
        `/admin/sprints/${selectedDayData.sprintId}/tasks/day/${selectedDayData.date}`
      );

      if (response.data.success) {
        toast({
          title: "Tâches supprimées",
          description: response.data.message,
        });

        // Rafraîchir la liste
        fetchSprints();
        setDeleteDayModalOpen(false);
      }
    } catch (error: any) {
      console.error("Erreur suppression tâches du jour:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les tâches du jour",
        variant: "destructive",
      });
    } finally {
      setDeletingDay(false);
      setSelectedDayData(null);
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-500">Actif</Badge>;
    }
    if (status === "expired") {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getTaskStatusIcon = (status: string) => {
    return status === "completed" ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <Circle className="w-4 h-4 text-gray-400" />
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Sprints</h1>
              <p className="text-muted-foreground">
                Utilisateur: {user?.name} ({user?.email})
              </p>
            </div>
          </div>
        </div>

        {/* Liste des achats */}
        {purchases.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Aucun achat de fonctionnalité Sprint Planning pour cet utilisateur
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <Card key={purchase.access_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        ACH-{purchase.access_id} - {purchase.feature_name}
                        {getStatusBadge(purchase.status, purchase.is_active)}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Acheté le:{" "}
                          {new Date(purchase.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        {purchase.expires_at && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            Expire le:{" "}
                            {new Date(purchase.expires_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{purchase.sprints_count} sprints</Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedAccessId(purchase.access_id);
                          setDeleteModalOpen(true);
                        }}
                        disabled={purchase.is_active}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer ACH-{purchase.access_id}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {purchase.sprints.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun sprint pour cet achat
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {purchase.sprints.map((sprint) => (
                        <div
                          key={sprint.id}
                          className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{sprint.title}</h3>
                                  <Badge variant="outline">
                                    Semaine {sprint.week_number} - {sprint.year}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    #{sprint.id}
                                  </span>
                                </div>
                                {sprint.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {sprint.description}
                                  </p>
                                )}
                                {sprint.project && (
                                  <Badge variant="secondary" className="text-xs">
                                    Projet: {sprint.project.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="text-xs text-muted-foreground text-right">
                                  <div>
                                    {new Date(sprint.start_date).toLocaleDateString("fr-FR")} →{" "}
                                    {new Date(sprint.end_date).toLocaleDateString("fr-FR")}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSprintId(sprint.id);
                                    setDeleteSprintModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            {/* Tâches groupées par jour */}
                            {sprint.tasks && sprint.tasks.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                                  <ListTodo className="w-4 h-4" />
                                  Tâches ({sprint.tasks.length})
                                </div>
                                {(() => {
                                  // Grouper les tâches par date
                                  const tasksByDate = sprint.tasks.reduce((acc, task) => {
                                    const date = task.scheduled_date;
                                    if (!acc[date]) {
                                      acc[date] = [];
                                    }
                                    acc[date].push(task);
                                    return acc;
                                  }, {} as Record<string, Task[]>);

                                  // Trier les dates
                                  const sortedDates = Object.keys(tasksByDate).sort();

                                  return (
                                    <div className="space-y-3">
                                      {sortedDates.map((date) => (
                                        <div key={date} className="space-y-1">
                                          <div className="text-xs font-semibold text-primary flex items-center gap-2 mb-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(date).toLocaleDateString("fr-FR", {
                                              weekday: "long",
                                              day: "numeric",
                                              month: "long"
                                            })}
                                            <Badge variant="outline" className="text-xs">
                                              {tasksByDate[date].length} tâche{tasksByDate[date].length > 1 ? "s" : ""}
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 ml-auto"
                                              onClick={() => {
                                                setSelectedDayData({
                                                  sprintId: sprint.id,
                                                  date: date,
                                                  tasksCount: tasksByDate[date].length
                                                });
                                                setDeleteDayModalOpen(true);
                                              }}
                                            >
                                              <Trash2 className="w-3 h-3 text-destructive" />
                                            </Button>
                                          </div>
                                          <div className="space-y-1 ml-5">
                                            {tasksByDate[date].map((task) => (
                                              <div
                                                key={task.id}
                                                className="flex items-start gap-2 text-sm py-1"
                                              >
                                                {getTaskStatusIcon(task.status)}
                                                <span className="flex-1">{task.title}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de confirmation de suppression d'achat */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer l'achat ACH-{selectedAccessId}
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Tous les sprints et tâches associés à cet
                achat seront définitivement supprimés.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePurchase}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmation de suppression de sprint individuel */}
        <Dialog open={deleteSprintModalOpen} onOpenChange={setDeleteSprintModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer le sprint #{selectedSprintId}
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Ce sprint et toutes ses tâches seront définitivement supprimés.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteSprintModalOpen(false)}
                disabled={deletingSprint}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSprint}
                disabled={deletingSprint}
              >
                {deletingSprint ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le sprint
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmation de suppression des tâches d'un jour */}
        <Dialog open={deleteDayModalOpen} onOpenChange={setDeleteDayModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer les tâches du {selectedDayData?.date && new Date(selectedDayData.date).toLocaleDateString("fr-FR")}
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. {selectedDayData?.tasksCount} tâche{selectedDayData && selectedDayData.tasksCount > 1 ? "s" : ""} {selectedDayData && selectedDayData.tasksCount > 1 ? "seront" : "sera"} définitivement supprimée{selectedDayData && selectedDayData.tasksCount > 1 ? "s" : ""}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDayModalOpen(false)}
                disabled={deletingDay}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteDay}
                disabled={deletingDay}
              >
                {deletingDay ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer {selectedDayData?.tasksCount} tâche{selectedDayData && selectedDayData.tasksCount > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUserSprints;
