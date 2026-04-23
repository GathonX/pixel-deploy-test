import api, { longOperationApi } from "./api";

export interface Task {
    id: number;
    sprint_id: number;
    title: string;
    description: string;
    type: "mission" | "vision" | "objective" | "action";
    priority: "high" | "medium" | "low" | "normal";
    status: "pending" | "in-progress" | "completed";
    scheduled_date: string;
    completed_at: string | null;
    order: number;
    created_at: string;
    updated_at: string;
}

export interface Sprint {
    id: number;
    user_id: number;
    project_id: number;
    week_number: number;
    year: number;
    start_date: string;
    end_date: string;
    title: string | null;
    description: string | null;
    status: "active" | "completed" | "archived";
    created_at: string;
    updated_at: string;
    tasks: Task[];
}

export const SprintService = {
    // Get the current active sprint
    getCurrentSprint: async (): Promise<Sprint | null> => {
        try {
            const response = await api.get('/sprints/current');
            if (response.data.success) {
                return response.data.sprint;
            }
            return null;
        } catch (error: any) {
            // 404 is normal when no sprint exists for the current week
            if (error?.response?.status !== 404) {
                console.error('Error fetching current sprint:', error);
            }
            return null;
        }
    },

    // ✅ NOUVEAU : Get the latest/most recent sprint (for expired features)
    // Permet aux utilisateurs avec fonctionnalité expirée de voir leurs anciens sprints
    getLatestSprint: async (): Promise<Sprint | null> => {
        try {
            const response = await api.get('/sprints/latest');
            if (response.data.success) {
                return response.data.sprint;
            }
            return null;
        } catch (error: any) {
            // 404 is normal when no sprint exists at all
            if (error?.response?.status !== 404) {
                console.error('Error fetching latest sprint:', error);
            }
            return null;
        }
    },

    // Get current project ID
    getCurrentProjectId: async (): Promise<number | null> => {
        try {
            const response = await api.get('/projects');
            const projects = response.data?.data || response.data || [];
            const first = Array.isArray(projects) ? projects[0] : null;
            return first?.id ?? null;
        } catch (error) {
            console.error('Error getting current project ID:', error);
            return null;
        }
    },

    // Generate a new sprint for the current week - USE LONG OPERATION API
    generateSprint: async (projectId: number): Promise<Sprint | null> => {
        try {
            console.log('🚀 [SprintService] Starting sprint generation with extended timeout...');
            const response = await longOperationApi.post('/sprints/generate', {
                project_id: projectId
            });
            if (response.data.success) {
                console.log('✅ [SprintService] Sprint generated successfully');
                return response.data.sprint;
            }
            return null;
        } catch (error) {
            console.error('❌ [SprintService] Error generating sprint:', error);
            throw error;
        }
    },

    // Generate additional tasks for a specific day - USE LONG OPERATION API
    generateDailyTasks: async (sprintId: number, dayOfWeek: string, count: number = 6): Promise<Task[]> => {
        try {
            console.log('🚀 [SprintService] Generating daily tasks with extended timeout...');
            const response = await longOperationApi.post('/sprints/tasks/daily', {
                sprint_id: sprintId,
                day_of_week: dayOfWeek,
                count: count
            });
            if (response.data.success) {
                console.log('✅ [SprintService] Daily tasks generated successfully');
                return response.data.tasks;
            }
            return [];
        } catch (error) {
            console.error('❌ [SprintService] Error generating daily tasks:', error);
            throw error;
        }
    },

    // Update task status
    updateTaskStatus: async (taskId: number, status: "pending" | "in-progress" | "completed"): Promise<Task | null> => {
        try {
            const response = await api.put(`/sprints/tasks/${taskId}/status`, {
                status: status
            });
            if (response.data.success) {
                return response.data.task;
            }
            return null;
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    },

    // Reorder tasks
    reorderTasks: async (taskUpdates: { id: number, order: number }[]): Promise<boolean> => {
        try {
            const response = await api.post('/sprints/tasks/reorder', {
                tasks: taskUpdates
            });
            return response.data.success;
        } catch (error) {
            console.error('Error reordering tasks:', error);
            throw error;
        }
    },

    // Create a new task
    createTask: async (
        sprintId: number,
        taskData: {
            title: string;
            description: string;
            type: string;
            priority: string;
            status: string;
            day_of_week: string;
        }
    ): Promise<Task | null> => {
        try {
            // Use the generateDailyTasks endpoint with a custom task
            const response = await api.post('/sprints/tasks/daily', {
                sprint_id: sprintId,
                day_of_week: taskData.day_of_week,
                count: 1,
                custom_task: {
                    title: taskData.title,
                    description: taskData.description,
                    type: taskData.type,
                    priority: taskData.priority,
                    status: taskData.status
                }
            });

            if (response.data.success && response.data.tasks && response.data.tasks.length > 0) {
                return response.data.tasks[0];
            }
            return null;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },

    // Fix existing sprints without user_feature_access_id
    fixExistingSprintsAccessIds: async (): Promise<{ success: boolean; updated: number; message: string } | null> => {
        try {
            const response = await api.post('/sprints/fix-access-ids');
            if (response.data.success) {
                return {
                    success: true,
                    updated: response.data.updated,
                    message: response.data.message
                };
            }
            return null;
        } catch (error) {
            console.error('Error fixing sprint access IDs:', error);
            throw error;
        }
    }
}; 