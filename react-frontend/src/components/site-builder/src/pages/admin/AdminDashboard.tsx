import { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Globe,
  Users,
  FileCode,
  TrendingUp,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { getDashboardStats, DashboardStats } from '../../services/siteBuilderService';

export default function AdminDashboard({ embedded, basePath = '/site-builder/admin' }: { embedded?: boolean; basePath?: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Dashboard" embedded={embedded}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout title="Dashboard" embedded={embedded}>
        <div className="text-center py-20 text-muted-foreground">
          Erreur lors du chargement des statistiques
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      label: 'Sites créés',
      value: stats.total_sites,
      icon: Globe,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: stats.sites_trend !== 0 ? `${stats.sites_trend > 0 ? '+' : ''}${stats.sites_trend}%` : null
    },
    {
      label: 'Utilisateurs',
      value: stats.total_users,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: stats.users_trend !== 0 ? `${stats.users_trend > 0 ? '+' : ''}${stats.users_trend}%` : null
    },
    {
      label: 'Templates actifs',
      value: stats.active_templates,
      icon: FileCode,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      trend: stats.total_templates > 0 ? `${stats.total_templates} total` : null
    },
    {
      label: 'Sites publiés',
      value: stats.published_sites,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      trend: `${stats.published_percent}%`
    },
  ];

  return (
    <AdminLayout title="Dashboard" embedded={embedded}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de votre plateforme
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to={`${basePath}/templates`}>
                Gérer les templates
              </Link>
            </Button>
            <Button asChild>
              <Link to={`${basePath}/templates/new`}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau template
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  {stat.trend && (
                    <Badge variant="secondary" className="text-green-600 bg-green-100">
                      {stat.trend}
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sites */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sites récents</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recent_sites.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun site créé pour le moment
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.recent_sites.map((site) => (
                    <div key={site.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {site.template_name && <span className="mr-2">{site.template_name}</span>}
                          Créé le {new Date(site.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge variant={site.status === 'published' ? 'default' : 'secondary'}>
                        {site.status === 'published' ? (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Publié</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> Brouillon</>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Templates Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Templates populaires</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`${basePath}/templates`} className="gap-2">
                  Gérer <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {stats.popular_templates.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun template actif
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.popular_templates.map((template) => (
                    <div key={template.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      {template.thumbnail ? (
                        <img
                          src={template.thumbnail}
                          alt={template.name}
                          className="w-16 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <FileCode className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">v{template.version}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{template.sites_count} site{template.sites_count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild>
                <Link to={`${basePath}/templates/new`}>
                  <Plus className="w-6 h-6" />
                  <span>Créer un template</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex-col gap-2" asChild>
                <Link to={`${basePath}/settings`}>
                  <FileCode className="w-6 h-6" />
                  <span>Paramètres globaux</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
