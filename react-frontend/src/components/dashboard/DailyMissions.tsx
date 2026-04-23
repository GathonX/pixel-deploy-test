import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, Calendar, Target, Activity, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { SprintService, Sprint, Task } from "@/services/sprintService";
import { Badge } from "@/components/ui/badge";
import api from "@/services/api";

export function DailyMissions() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSprintAccess, setHasSprintAccess] = useState(false);

  useEffect(() => {
    loadTodayTasks();

    // 🔄 Écouter les changements de statut de tâches
    const handleTaskStatusUpdate = () => {
      loadTodayTasks();
    };

    window.addEventListener('taskStatusUpdated', handleTaskStatusUpdate);

    return () => {
      window.removeEventListener('taskStatusUpdated', handleTaskStatusUpdate);
    };
  }, []);

  const loadTodayTasks = async () => {
    try {
      setLoading(true);

      // ✅ VÉRIFIER SI L'UTILISATEUR A ACCÈS À LA FONCTIONNALITÉ SPRINT
      try {
        const accessResponse = await api.get('/features/check-access/sprint_planning');
        const hasAccess = accessResponse.data?.has_access || false;
        setHasSprintAccess(hasAccess);

        // Si pas d'accès, ne pas charger le sprint
        if (!hasAccess) {
          setTodayTasks([]);
          setSprint(null);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error checking sprint access:", error);
        setHasSprintAccess(false);
        setTodayTasks([]);
        setSprint(null);
        setLoading(false);
        return;
      }

      // Get current sprint (seulement si l'utilisateur a accès)
      const currentSprint = await SprintService.getCurrentSprint();
      if (currentSprint) {
        setSprint(currentSprint);

        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Filter tasks for today
        const tasksForToday = currentSprint.tasks.filter(task => {
          if (!task.scheduled_date) return false;
          const taskDate = task.scheduled_date.split('T')[0];
          return taskDate === todayStr;
        });

        // If no tasks for today, get tasks for current day of week
        if (tasksForToday.length === 0) {
          const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
          const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0=Monday, 6=Sunday

          // Calculate target date based on sprint start date
          const startDate = new Date(currentSprint.start_date);
          const targetDate = new Date(startDate);
          targetDate.setDate(startDate.getDate() + adjustedDay);
          const targetDateStr = targetDate.toISOString().split('T')[0];

          const dayTasks = currentSprint.tasks.filter(task => {
            if (!task.scheduled_date) return false;
            const taskDate = task.scheduled_date.split('T')[0];
            return taskDate === targetDateStr;
          });

          setTodayTasks(dayTasks);
        } else {
          setTodayTasks(tasksForToday);
        }
      } else {
        // No sprint found, set empty tasks
        setTodayTasks([]);
        setSprint(null);
      }
    } catch (error: any) {
      console.error("Error loading today's tasks:", error);

      // Check if it's a 404 (no sprint found) vs a real error
      if (error?.response?.status === 404 || error?.status === 404) {
        // No sprint exists for this week, set empty state
        setTodayTasks([]);
        setSprint(null);
      } else {
        // Real error, log it but still set empty state for UX
        console.error("Unexpected error:", error);
        setTodayTasks([]);
        setSprint(null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Plan du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = () => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-amber-500";
      case "low": return "text-green-500";
      default: return "text-slate-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mission": return <Flag className="h-4 w-4 text-indigo-500" />;
      case "vision": return <Flag className="h-4 w-4 text-purple-500" />;
      case "objective": return <Target className="h-4 w-4 text-green-500" />;
      case "action": return <Activity className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress": return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
    }
  };

  // Group tasks by type
  const missionTasks = todayTasks.filter(task => task.type === "mission");
  const visionTasks = todayTasks.filter(task => task.type === "vision");
  const objectiveTasks = todayTasks.filter(task => task.type === "objective");
  const actionTasks = todayTasks.filter(task => task.type === "action");

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex justify-between w-full">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Plan du jour - {formatDate()}
            </div>
            <div>
              <Link to="/sprint-view" className="text-sm text-indigo-500 font-medium border border-indigo-500 rounded-md px-2 py-1 hover:bg-indigo-500 hover:text-white transition-colors">
                Voir toutes
              </Link>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {todayTasks.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            {!sprint ? (
              <>
                <p className="mb-2">Aucun sprint actif pour cette semaine.</p>
                <Link to="/sprint-view" className="text-sm text-indigo-500 font-medium hover:underline">
                  Créer un sprint pour cette semaine
                </Link>
              </>
            ) : (
              <>
                <p className="mb-2">Aucune tâche planifiée pour aujourd'hui.</p>
                <Link to="/sprint-view" className="text-sm text-indigo-500 font-medium hover:underline">
                  Voir toutes les tâches de la semaine
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mission Tasks */}
            {missionTasks.length > 0 && (
              <div className="border-l-4 border-indigo-500 pl-4 py-1">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-indigo-500" />
                  Missions ({missionTasks.length})
                </h3>
                <div className="space-y-2">
                  {missionTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{task.title}</span>
                          {task.priority !== "normal" && (
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority === "high" ? "Urgent" : "Important"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vision Tasks */}
            {visionTasks.length > 0 && (
              <div className="border-l-4 border-purple-500 pl-4 py-1">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Flag className="h-4 w-4 text-purple-500" />
                  Vision ({visionTasks.length})
                </h3>
                <div className="space-y-2">
                  {visionTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{task.title}</span>
                          {task.priority !== "normal" && (
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority === "high" ? "Urgent" : "Important"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objective Tasks */}
            {objectiveTasks.length > 0 && (
              <div className="border-l-4 border-green-500 pl-4 py-1">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-500" />
                  Objectifs ({objectiveTasks.length})
                </h3>
                <div className="space-y-2">
                  {objectiveTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{task.title}</span>
                          {task.priority !== "normal" && (
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority === "high" ? "Urgent" : "Important"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Tasks */}
            {actionTasks.length > 0 && (
              <div className="border-l-4 border-amber-500 pl-4 py-1">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  Actions Marketing ({actionTasks.length})
                </h3>
                <div className="space-y-2">
                  {actionTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{task.title}</span>
                          {task.priority !== "normal" && (
                            <Badge variant="outline" className={getPriorityColor(task.priority)}>
                              {task.priority === "high" ? "Urgent" : "Important"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total des tâches: {todayTasks.length}</span>
                <span>Terminées: {todayTasks.filter(t => t.status === "completed").length}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
