import { useState, useEffect } from "react";
import api from "../services/api";

export interface Project {
    id: number;
    name: string;
    description: string | null;
    user_id?: number;
    created_at?: string;
    updated_at?: string;
}

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const response = await api.get('/projects');
                if (response.data && Array.isArray(response.data)) {
                    setProjects(response.data);
                } else {
                    setProjects([]);
                }
                setError(null);
            } catch (err) {
                console.error("Error fetching projects:", err);
                setError("Impossible de charger les projets");
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
        console.log("Projects fetched:", projects);
    }, []);

    return { projects, loading, error };
} 