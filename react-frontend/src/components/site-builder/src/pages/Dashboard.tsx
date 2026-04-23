import { useState } from 'react';
import { usePlatform } from '../contexts/PlatformContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { TemplateCard } from '../components/templates/TemplateCard';
import { TemplatePreview } from '../components/templates/TemplatePreview';
import { CreateSiteDialog } from '../components/templates/CreateSiteDialog';
import { SiteCard } from '../components/sites/SiteCard';
import { Template } from '@/types/platform';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Layout, Globe, Settings, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Site } from '@/types/platform';

export default function Dashboard() {
  const { sites, isLoading, templates, getSiteDomains, deleteSite, currentUser } = usePlatform();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState(sites.length > 0 ? 'sites' : 'templates');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  const canPublishMore = workspace
    ? workspace.published_sites_count < workspace.max_published_sites
    : false;

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handlePreviewTemplate = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleUseTemplateFromPreview = (template: Template) => {
    setPreviewTemplate(null);
    setSelectedTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleDeleteSite = (site: Site) => {
    setSiteToDelete(site);
  };

  const confirmDelete = () => {
    if (siteToDelete) {
      deleteSite(siteToDelete.id);
      toast.success('Site supprimé');
      setSiteToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SiteBuilder Pro</h1>
              <p className="text-sm text-muted-foreground">Créez votre site en quelques clics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' && (
              <Button variant="outline" onClick={() => window.location.href = '/site-builder/admin'}>
                Administration
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="sites" className="gap-2">
                <Globe className="w-4 h-4" />
                Mes Projets ({sites.length})
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <Layout className="w-4 h-4" />
                Templates
              </TabsTrigger>
            </TabsList>
          </div>

          {/* My Sites Tab */}
          <TabsContent value="sites" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border bg-card shadow-sm overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
                <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun projet pour l'instant</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par choisir un template pour créer votre premier projet
                </p>
                <Button onClick={() => setActiveTab('templates')}>
                  <Layout className="w-4 h-4 mr-2" />
                  Choisir un template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    domains={getSiteDomains(site.id)}
                    onDelete={handleDeleteSite}
                    canPublishMore={canPublishMore}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Choisissez un template</h2>
              <p className="text-muted-foreground">
                Sélectionnez un template comme base pour votre nouveau site. Vous pourrez le personnaliser entièrement.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {templates.filter(t => t.status === 'active').map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  onPreview={handlePreviewTemplate}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Site Dialog */}
      <CreateSiteDialog
        template={selectedTemplate}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultWorkspaceId={workspace?.id ? String(workspace.id) : undefined}
      />

      {/* Template Preview Dialog */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          open={!!previewTemplate}
          onOpenChange={(open) => !open && setPreviewTemplate(null)}
          onUseTemplate={handleUseTemplateFromPreview}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!siteToDelete} onOpenChange={() => setSiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce site ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données du site "{siteToDelete?.name}" seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
