// src/pages/Dashboard.tsx - VERSION CORRIGÉE SANS localStorage

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu, ExternalLink, CheckCircle2, Clock, FileText, Share2 } from "lucide-react";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuthRefresh } from '@/hooks/useAuthRefresh';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRedirect } from '@/hooks/useAdminRedirect';
import { useParams } from 'react-router-dom';
import SEOHead from "@/components/SEOHead";
import { SprintService } from "@/services/sprintService";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface RecentActivity {
  id: string;
  type: 'task' | 'blog' | 'social' | 'feature' | 'project' | 'plan';
  title: string;
  status: string;
  date: string;
  icon?: string;
}

const DashboardContent = () => {
  const { setOpenMobile } = useSidebar();
  const { isAuthenticated, user, loading, refreshUser } = useAuth();
  const { siteId } = useParams<{ siteId: string }>();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // ✅ REDIRECTION AUTOMATIQUE ADMIN - Redirige les admins vers /admin/dashboard
  useAdminRedirect();

  useEffect(() => {
    console.log('✅ [Dashboard] État utilisateur:', {
      isAuthenticated,
      userName: user?.name,
      userRole: user?.role,
      loading
    });
  }, [isAuthenticated, user, loading]);

  // Charger les activités récentes
  useEffect(() => {
    const loadRecentActivities = async () => {
      try {
        setLoadingActivities(true);
        const activities: RecentActivity[] = [];

        // 1. Tâches du sprint
        try {
          const sprint = await SprintService.getCurrentSprint();
          if (sprint && sprint.tasks) {
            sprint.tasks.forEach(task => {
              activities.push({
                id: `task-${task.id}`,
                type: 'task',
                title: task.title,
                status: task.status,
                date: task.updated_at || task.created_at
              });
            });
          }
        } catch (e) {
          console.log('Pas de sprint actuel');
        }

        // 2. Posts de blog récents
        try {
          const blogParams = new URLSearchParams({ per_page: '10' });
          if (siteId) blogParams.set('site_id', siteId);
          const blogResponse = await fetch(`/api/blog?${blogParams}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (blogResponse.ok) {
            const blogData = await blogResponse.json();
            blogData.data?.forEach((post: any) => {
              activities.push({
                id: `blog-${post.id}`,
                type: 'blog',
                title: post.title,
                status: post.status,
                date: post.created_at
              });
            });
          }
        } catch (e) {
          console.log('Erreur chargement blogs');
        }

        // 3. Posts social media récents
        try {
          const socialParams = new URLSearchParams({ per_page: '10' });
          if (siteId) socialParams.set('site_id', siteId);
          const socialResponse = await fetch(`/api/social?${socialParams}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (socialResponse.ok) {
            const socialData = await socialResponse.json();
            socialData.data?.forEach((post: any) => {
              activities.push({
                id: `social-${post.id}`,
                type: 'social',
                title: `Post ${post.platform}`,
                status: post.status,
                date: post.created_at,
                icon: post.platform
              });
            });
          }
        } catch (e) {
          console.log('Erreur chargement social media');
        }

        // 4. Projets récents
        try {
          const projectsResponse = await fetch('/api/projects?limit=5', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            projectsData.forEach((project: any) => {
              activities.push({
                id: `project-${project.id}`,
                type: 'project',
                title: `Projet: ${project.name}`,
                status: 'active',
                date: project.updated_at || project.created_at
              });
            });
          }
        } catch (e) {
          console.log('Erreur chargement projets');
        }

        // Trier par date et prendre les 10 plus récents
        const sortedActivities = activities
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        setRecentActivities(sortedActivities);
      } catch (error) {
        console.error('Erreur chargement activités:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    if (isAuthenticated && !loading) {
      loadRecentActivities();
    }
  }, [isAuthenticated, loading]);

  // 🔄 Synchronisation en temps réel avec les modifications admin
  useEffect(() => {
    const handleUserProfileUpdate = (event: CustomEvent) => {
      console.log('🔄 [Dashboard] Synchronisation reçue:', event.detail);
      // Rafraîchir les données utilisateur depuis le serveur
      if (refreshUser) {
        refreshUser();
      }
    };

    // Écouter l'événement de mise à jour (même logique que la modification qui fonctionne)
    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);

    // Nettoyage
    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    };
  }, [refreshUser]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/20">
        <p className="text-gray-600">Redirection...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50/20"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <SidebarInset className="bg-white/80 backdrop-blur-sm border-r border-slate-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden mr-2 hover:bg-slate-100/50"
                onClick={() => setOpenMobile(true)}
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                {user && (
                  <p className="text-sm text-slate-500">Bienvenue, <span className="font-medium text-slate-700">{user.name}</span></p>
                )}
              </div>
            </div>
            
            {/* Bouton Voir mon site */}
            {user?.website && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 hover:bg-slate-50"
                onClick={() => window.open(user.website, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Voir mon site
              </Button>
            )}
          </div>

          {/* Stats */}
          <DashboardStats siteId={siteId} />

          {/* Activité récente */}
          <div className="mb-8 mt-8">
            <Card className="border border-slate-100 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  Activité récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune activité récente</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="mt-0.5">
                          {activity.type === 'task' && activity.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {activity.type === 'task' && activity.status === 'in-progress' && (
                            <Clock className="h-4 w-4 text-blue-500" />
                          )}
                          {activity.type === 'task' && activity.status === 'pending' && (
                            <Clock className="h-4 w-4 text-slate-400" />
                          )}
                          {activity.type === 'blog' && <FileText className="h-4 w-4 text-purple-500" />}
                          {activity.type === 'social' && <Share2 className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{activity.title}</p>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </SidebarInset>
    </motion.div>
  );
};

const Dashboard = () => {
  return (
    <>
      <SEOHead
        title="Dashboard Pixel Rise – Vue d'ensemble de votre marketing automatisé"
        description="Suivez vos performances marketing, vos contenus IA, vos campagnes social media et vos projets d'entreprise depuis le dashboard Pixel Rise."
        canonicalUrl={`${import.meta.env.VITE_CANONICAL_URL}/dashboard`}
      />
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </>
  );
};

export default Dashboard;