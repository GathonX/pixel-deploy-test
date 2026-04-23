import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlatform } from '../contexts/PlatformContext';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { DraggableSection } from '../components/editor/DraggableSection';
import { SectionRenderer } from '../components/editor/SectionRenderer';
import { EnhancedSectionEditor } from '../components/editor/EnhancedSectionEditor';
import { AddSectionPanel } from '../components/editor/AddSectionPanel';
import { ThemeEditor } from '../components/editor/ThemeEditor';
import { PageManager } from '../components/editor/PageManager';
import { EditorLanguageBar } from '../components/editor/EditorLanguageBar';
import { SeoConfigEditor } from '../components/editor/SeoConfigEditor';
import { PublishDialog } from '../components/editor/PublishDialog';
import { DeviceFrame } from '../components/editor/DeviceFrame';
import { LiveSectionPreview } from '../components/editor/previews/LiveSectionPreview';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  ArrowLeft, Eye, Save, Globe, Layers, Plus,
  Monitor, Tablet, Smartphone, Undo2, Redo2, Upload, Sparkles, FileText, Search,
  Copy, Check, ExternalLink, Menu, PanelLeft, PanelRight, MoreVertical, RefreshCw, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { Section, Page, SeoConfig } from '../types/platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type RightPanelTab = 'sections' | 'editor' | 'theme' | 'seo';

// Fonction pour générer un slug URL-safe
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const viewportConfig = {
  desktop: { width: '100%', label: 'Desktop', resolution: '1920 × 1080' },
  tablet: { width: '768px', label: 'iPad', resolution: '768 × 1024' },
  mobile: { width: '375px', label: 'iPhone', resolution: '375 × 812' }
};

export default function Editor() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const isMobile  = useIsMobile();
  const isTablet  = useIsTablet();
  const isDesktop = !isMobile && !isTablet;
  const {
    sites, isLoading, getSitePages, getPageSections, getSiteDomains,
    getSiteNavbar, getSiteFooter, sectionTypes,
    updateSectionContent, updateSectionStyles, addSection, removeSection,
    reorderSections, publishSite, unpublishSite, addPage, deletePage, updatePage, duplicatePage, updateSiteSeo,
    updateGlobalSectionContent, updateGlobalSectionStyles, replaceGlobalSection, updateSiteStyles,
    loadSiteLangs,
  } = usePlatform() as any;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const site = sites.find(s => s.id === siteId);
  const pages = site ? getSitePages(site.id) : [];
  const domains = site ? getSiteDomains(site.id) : [];

  // Charger les langues du site dès que le siteId est disponible
  useEffect(() => {
    if (siteId) loadSiteLangs(siteId);
  }, [siteId]);
  const navbar = site ? getSiteNavbar(site.id) : null;
  const footer = site ? getSiteFooter(site.id) : null;
  const { templates } = usePlatform();
  const template = site ? templates.find(t => t.id === site.sourceTemplateId) : null;

  // Template family = first segment of the template ID (e.g. 'luxios' from 'luxios-hotel').
  // Used to filter sections in AddSectionPanel and drive template-specific behaviour.
  const templateFamily = site?.sourceTemplateId?.split('-')[0] ?? '';
  const isLuxiosTemplate = templateFamily === 'luxios';

  // Cherche un domaine personnalisé vérifié
  const verifiedCustomDomain = domains.find(d => ['verified', 'active'].includes(d.status) && d.type === 'custom');

  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingGlobalSection, setEditingGlobalSection] = useState<'navbar' | 'footer' | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanelTab>('sections');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [siteTheme, setSiteTheme] = useState<Record<string, unknown>>(site?.globalStyles || {});
  const saveThemeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync siteTheme when site data loads asynchronously (ex: rechargement direct de la page)
  // useState n'utilise l'initialValue qu'une seule fois — ce useEffect corrige la désynchronisation
  useEffect(() => {
    if (site?.globalStyles && Object.keys(site.globalStyles as Record<string, unknown>).length > 0) {
      setSiteTheme(site.globalStyles);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [previewLinkCopied, setPreviewLinkCopied] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen]   = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [changingGlobalSection, setChangingGlobalSection] = useState<'navbar' | 'footer' | null>(null);

  const currentPage = pages.find(p => p.id === currentPageId);
  const sections = currentPageId ? getPageSections(currentPageId) : [];
  const selectedSection = sections.find(s => s.id === selectedSectionId);

  // Generate preview URL
  const getPreviewUrl = (): string => {
    if (!site) return '';

    // Si domaine personnalisé vérifié → utiliser ce domaine
    if (verifiedCustomDomain) {
      return `https://${verifiedCustomDomain.domain}`;
    }

    // Sinon → URL interne de prévisualisation
    const templateSlug = slugify(template?.name || 'template');
    const siteSlug = slugify(site.name);
    return `${window.location.origin}/site-builder/preview/${site.userId}/${templateSlug}/${siteSlug}/${site.previewToken}`;
  };

  const previewUrl = getPreviewUrl();

  // Set initial page
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      setCurrentPageId(pages[0].id);
    }
  }, [pages, currentPageId]);

  // Update editing section ONLY when a DIFFERENT section is selected (by ID)
  // Ne pas réagir aux changements de contenu pour éviter de perdre les modifications en cours
  useEffect(() => {
    if (selectedSectionId && selectedSection) {
      setEditingSection(selectedSection);
      setRightPanel('editor');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]); // Dépend uniquement de l'ID, pas de l'objet section

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Site introuvable</h1>
          <p className="text-muted-foreground mb-4">Ce site n'existe pas ou a été supprimé.</p>
          <Button onClick={() => navigate('/site-builder')}>Retour au dashboard</Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    updateSiteStyles(site.id, siteTheme);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    toast.success('Modifications enregistrées');
  };

  const handlePublish = () => {
    const autoSubdomain = site.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    publishSite(site.id, autoSubdomain);
    toast.success('Site publié !', { description: 'Votre site est maintenant en ligne.' });
  };

  const handleUnpublish = () => {
    unpublishSite(site.id);
    toast.success('Site dépublié');
  };

  const handleCopyPreviewLink = () => {
    navigator.clipboard.writeText(previewUrl);
    setPreviewLinkCopied(true);
    toast.success('Lien de prévisualisation copié !');
    setTimeout(() => setPreviewLinkCopied(false), 2000);
  };

  const handleOpenPreview = () => {
    window.open(previewUrl, '_blank');
  };

  const handleUpdateSection = (content: Record<string, unknown>, styles: Record<string, unknown>) => {
    if (editingSection) {
      // Check if it's a global section (navbar or footer)
      if (editingGlobalSection) {
        updateGlobalSectionContent(editingSection.id, content);
        updateGlobalSectionStyles(editingSection.id, styles);
      } else {
        updateSectionContent(editingSection.id, content);
        updateSectionStyles(editingSection.id, styles);
      }
      setEditingSection({ ...editingSection, content, styles });
    }
  };

  const handleAddSection = async (sectionTypeId: string, variantStyles?: Record<string, any>) => {
    if (currentPageId) {
      const newSection = await addSection(currentPageId, sectionTypeId, sections.length, variantStyles);
      if (newSection?.id) {
        setSelectedSectionId(newSection.id);
        toast.success('Section ajoutée');
      }
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    removeSection(sectionId);
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
      setEditingSection(null);
      setEditingGlobalSection(null);
      setRightPanel('sections');
    }
    toast.success('Section supprimée');
  };

  // Get available types for navbar or footer
  const getAvailableGlobalTypes = (position: 'navbar' | 'footer') => {
    return sectionTypes.filter((st: any) => st.id.startsWith(position));
  };

  const handleChangeGlobalSectionType = async (newTypeId: string) => {
    if (!site || !changingGlobalSection) return;
    await replaceGlobalSection(site.id, changingGlobalSection, newTypeId);
    setChangingGlobalSection(null);
    // Reset editing state since the section ID changed
    setEditingSection(null);
    setEditingGlobalSection(null);
    setSelectedSectionId(null);
  };

  const handleEditGlobalSection = (position: 'navbar' | 'footer') => {
    const globalSection = position === 'navbar' ? navbar : footer;
    if (globalSection) {
      // Convert global section to Section format for the editor
      const sectionForEditor: Section = {
        id: globalSection.id,
        pageId: '',
        sectionTypeId: globalSection.sectionTypeId,
        order: position === 'navbar' ? -1 : 999,
        content: globalSection.content,
        styles: globalSection.styles,
        translations: globalSection.translations ?? {},
      };
      setSelectedSectionId(globalSection.id);
      setEditingSection(sectionForEditor);
      setEditingGlobalSection(position);
      setRightPanel('editor');
    }
  };

  const handleDuplicateSection = async (section: Section) => {
    if (currentPageId) {
      const newSection = await addSection(currentPageId, section.sectionTypeId, sections.length);
      if (newSection?.id) {
        updateSectionContent(newSection.id, section.content as Record<string, unknown>);
        updateSectionStyles(newSection.id, section.styles as Record<string, unknown>);
        toast.success('Section dupliquée');
      }
    }
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!currentPageId) return;
    const index = sections.findIndex(s => s.id === sectionId);
    if (direction === 'up' && index > 0) {
      const newOrder = sections.map(s => s.id);
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      reorderSections(currentPageId, newOrder);
    } else if (direction === 'down' && index < sections.length - 1) {
      const newOrder = sections.map(s => s.id);
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      reorderSections(currentPageId, newOrder);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && currentPageId) {
      const oldIndex = sections.findIndex((s: any) => s.id === active.id);
      const newIndex = sections.findIndex((s: any) => s.id === over.id);
      const newOrder = arrayMove(sections.map((s: any) => s.id as string), oldIndex, newIndex);
      reorderSections(currentPageId, newOrder);
      toast.success('Sections réorganisées');
    }
  };

  const handleAddPage = async (name: string, slug: string) => {
    if (site) {
      const newPage = await addPage(site.id, name, slug);
      if (newPage?.id) {
        setCurrentPageId(newPage.id);
      }
    }
  };

  const handleDeletePage = (pageId: string) => {
    deletePage(pageId);
    if (currentPageId === pageId && pages.length > 1) {
      const remainingPages = pages.filter((p: any) => p.id !== pageId);
      setCurrentPageId(remainingPages[0]?.id || null);
    }
  };

  const handleDuplicatePage = async (pageId: string) => {
    const newPage = await duplicatePage(pageId);
    if (newPage?.id) {
      setCurrentPageId(newPage.id);
      toast.success('Page dupliquée');
    }
  };

  // Sidebar content components for reuse
  const PagesSidebarContent = (
    <PageManager
      pages={pages}
      currentPageId={currentPageId}
      onSelectPage={(pageId) => {
        setCurrentPageId(pageId);
        if (!isDesktop) setLeftPanelOpen(false);
      }}
      onAddPage={handleAddPage}
      onDeletePage={handleDeletePage}
      onUpdatePage={updatePage}
      onDuplicatePage={handleDuplicatePage}
    />
  );

  const RightSidebarContent = (
    <Tabs value={rightPanel} onValueChange={(v) => setRightPanel(v as RightPanelTab)} className="h-full flex flex-col">
      <div className="border-b shrink-0">
        <TabsList className="w-full rounded-none h-12">
          <TabsTrigger value="sections" className="flex-1 px-2" title="Sections — Ajouter ou gérer les sections de la page">
            <Plus className="w-4 h-4 mr-1" />
            <span className={cn(isMobile ? "sr-only" : "")}>Sections</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex-1 px-2" disabled={!editingSection} title="Édition — Modifier le contenu, le style et la mise en page de la section sélectionnée">
            <Layers className="w-4 h-4 mr-1" />
            <span className={cn(isMobile ? "sr-only" : "")}>Édition</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex-1 px-2" title="Thème — Personnaliser les couleurs, polices et espaces du site">
            <Sparkles className="w-4 h-4 mr-1" />
            <span className={cn(isMobile ? "sr-only" : "")}>Thème</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex-1 px-2" title="SEO — Configurer le référencement et le partage social">
            <Search className="w-4 h-4 mr-1" />
            <span className={cn(isMobile ? "sr-only" : "")}>SEO</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sections" className="m-0 flex-1 overflow-hidden">
        <AddSectionPanel
          templateFamily={templateFamily}
          templateName={template?.name}
          onAddSection={(typeId, styles) => {
            handleAddSection(typeId, styles);
            if (!isDesktop) setRightPanelOpen(false);
          }}
        />
      </TabsContent>

      <TabsContent value="editor" className="m-0 flex-1 overflow-hidden">
        {editingSection ? (
          <div className="h-full flex flex-col">
            {editingGlobalSection && (
              <div className="px-4 py-2 bg-primary/10 border-b text-sm text-primary flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Section globale ({editingGlobalSection === 'navbar' ? 'Navigation' : 'Pied de page'})</span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <EnhancedSectionEditor
                section={editingSection}
                onUpdate={handleUpdateSection}
                onClose={() => {
                  setEditingSection(null);
                  setSelectedSectionId(null);
                  setEditingGlobalSection(null);
                  setRightPanel('sections');
                }}
              />
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <p>Sélectionnez une section pour l'éditer</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="theme" className="m-0 flex-1 overflow-hidden">
        <ThemeEditor
          siteId={site.id}
          initialTheme={siteTheme as any}
          isLuxiosTemplate={isLuxiosTemplate}
          templateName={template?.name}
          onThemeChange={(theme) => {
            setSiteTheme(theme as unknown as Record<string, unknown>);
            if (saveThemeTimerRef.current) clearTimeout(saveThemeTimerRef.current);
            saveThemeTimerRef.current = setTimeout(() => {
              updateSiteStyles(site.id, theme as unknown as Record<string, unknown>);
            }, 1500);
          }}
        />
      </TabsContent>

      <TabsContent value="seo" className="m-0 flex-1 overflow-hidden">
        <SeoConfigEditor
          siteId={site.id}
          siteName={site.name}
          siteDomain={(() => {
            const domains = getSiteDomains(site.id);
            const custom = domains.find((d: any) => d.type === 'custom' && (d.status === 'active' || d.status === 'verified'));
            const domain = custom?.domain || site.subdomain;
            return domain ? `https://${domain}` : undefined;
          })()}
          config={site.seoConfig || { siteTitle: site.name, siteDescription: '', siteKeywords: [], robotsIndex: true, robotsFollow: true }}
          onUpdate={(config) => updateSiteSeo(site.id, config)}
          onClose={() => setRightPanel('sections')}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Top Bar */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-2 md:px-4 shrink-0">
        <TooltipProvider delayDuration={400}>
        <div className="flex items-center gap-1 md:gap-2 lg:gap-4 min-w-0">
          {/* Mobile + Tablet: Left panel toggle */}
          {!isDesktop && (
            <Sheet open={leftPanelOpen} onOpenChange={setLeftPanelOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <PanelLeft className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Pages & Langues</TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="w-72 p-0">
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">Pages</h2>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {PagesSidebarContent}
                  </div>
                  {siteId && <EditorLanguageBar siteId={siteId} />}
                </div>
              </SheetContent>
            </Sheet>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => navigate('/site-builder')} className="h-8 shrink-0 px-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden lg:inline ml-1">Dashboard</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Retour au Dashboard</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border hidden lg:block shrink-0" />

          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-sm truncate max-w-[100px] md:max-w-[160px] lg:max-w-none">{site.name}</h1>
              {site.status === 'published' ? (
                <Badge variant="default" className="bg-green-500 text-xs shrink-0">En ligne</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs shrink-0">Brouillon</Badge>
              )}
            </div>
            {currentPage && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span className="truncate">{currentPage.name}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Viewport Switcher — hidden on mobile */}
          {!isMobile && (
            <div className="flex items-center gap-1 border rounded-lg px-1.5 py-1 bg-muted/50">
              <Button variant={viewport === 'desktop' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewport('desktop')} title="Desktop">
                <Monitor className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewport === 'tablet' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewport('tablet')} title="Tablet">
                <Tablet className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewport === 'mobile' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewport('mobile')} title="Mobile">
                <Smartphone className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground font-mono hidden xl:inline pl-1 pr-0.5">
                {viewportConfig[viewport].resolution}
              </span>
            </div>
          )}

          <div className="h-6 w-px bg-border hidden lg:block" />

          {/* Desktop full actions (≥ 1024px) */}
          {isDesktop && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled title="Annuler">
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" disabled title="Rétablir">
                <Redo2 className="w-4 h-4" />
              </Button>
              <div className="h-6 w-px bg-border" />
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <div className="flex items-center">
                <Button variant="outline" size="sm" onClick={handleOpenPreview} className="rounded-r-none border-r-0">
                  <Eye className="w-4 h-4 mr-1.5" />
                  Aperçu
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={handleCopyPreviewLink} title="Copier le lien">
                  {previewLinkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <Button size="sm" onClick={() => setShowPublishDialog(true)}>
                <Upload className="w-4 h-4 mr-1.5" />
                {site.status === 'published' ? 'Gérer' : 'Publier'}
              </Button>
              {/* Domaine — visible seulement si site publié */}
              {site.status === 'published' && (
                verifiedCustomDomain ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/site-builder/domains/${site.id}`)}
                    className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                    title={`Domaine actif : ${verifiedCustomDomain.domain}`}
                  >
                    <Globe className="w-4 h-4" />
                    {verifiedCustomDomain.domain}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/site-builder/domains/${site.id}`)}
                    className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white border-0"
                    title="Connectez votre propre domaine"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Votre domaine
                  </Button>
                )
              )}
            </div>
          )}

          {/* Tablet compact actions (768–1023px) */}
          {isTablet && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleOpenPreview}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Aperçu du site</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyPreviewLink}>
                    {previewLinkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{previewLinkCopied ? 'Lien copié !' : 'Copier le lien d\'aperçu'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="h-8 px-2" onClick={() => setShowPublishDialog(true)}>
                    <Upload className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{site.status === 'published' ? 'Gérer la publication' : 'Publier le site'}</TooltipContent>
              </Tooltip>
              {site.status === 'published' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className={`h-8 w-8 ${verifiedCustomDomain ? 'text-green-700 border-green-300 hover:bg-green-50' : 'bg-orange-500 hover:bg-orange-600 text-white border-0'}`}
                      variant={verifiedCustomDomain ? 'outline' : 'default'}
                      onClick={() => navigate(`/site-builder/domains/${site.id}`)}
                    >
                      <Globe className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {verifiedCustomDomain ? `Domaine : ${verifiedCustomDomain.domain}` : 'Connecter votre domaine'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Mobile actions dropdown (< 768px) */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSave} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenPreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Aperçu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyPreviewLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le lien
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPublishDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  {site.status === 'published' ? 'Gérer' : 'Publier'}
                </DropdownMenuItem>
                {site.status === 'published' && (
                  <DropdownMenuItem onClick={() => navigate(`/site-builder/domains/${site.id}`)}>
                    {verifiedCustomDomain
                      ? <><Globe className="w-4 h-4 mr-2 text-green-600" />{verifiedCustomDomain.domain}</>
                      : <><ShoppingCart className="w-4 h-4 mr-2 text-orange-500" />Votre domaine</>
                    }
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile + Tablet: Right panel toggle */}
          {!isDesktop && (
            <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="default" size="icon" className="h-8 w-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Ajouter / Éditer sections</TooltipContent>
              </Tooltip>
              <SheetContent side="right" className="w-80 p-0">
                <div className="h-full">
                  {RightSidebarContent}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        </TooltipProvider>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Pages (Desktop ≥ 1024px only) */}
        {isDesktop && (
          <aside className="w-60 border-r bg-card shrink-0 flex flex-col z-10 overflow-y-auto">
            <div className="flex-1">
              {PagesSidebarContent}
            </div>
            {siteId && <EditorLanguageBar siteId={siteId} />}
          </aside>
        )}
        {/* Canvas - conteneur isolé pour éviter les débordements sur les sidebars */}
        <main className="flex-1 overflow-hidden bg-muted/50 relative">
          <div className="w-full h-full overflow-y-auto overflow-x-hidden p-8">
            <div className="flex justify-center">
              <DeviceFrame viewport={viewport}>
                <div className="theme-preview overflow-hidden flex flex-col min-h-full">
                  {/* Global Navbar */}
                  {navbar && (
                    <div
                      className={cn(
                        "relative group cursor-pointer transition-all",
                        selectedSectionId === navbar.id && "ring-2 ring-primary ring-inset"
                      )}
                      onClick={() => handleEditGlobalSection('navbar')}
                    >
                      <div className="pointer-events-none">
                        <SectionRenderer
                          sectionTypeId={navbar.sectionTypeId}
                          content={navbar.content}
                          styles={navbar.styles}
                          onNavigate={(slug) => {
                            const targetPage = pages.find((p: any) => p.slug === slug || p.slug === `/${slug}` || p.name.toLowerCase() === slug.toLowerCase());
                            if (targetPage) {
                              setCurrentPageId(targetPage.id);
                            }
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 z-10 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-auto">
                        <Badge className="bg-primary text-white">Navbar global - Cliquer pour éditer</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); setChangingGlobalSection('navbar'); }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Changer le style
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Page Content */}
                  <div className="flex-1">
                    {currentPage && sections.length === 0 ? (
                      <div className="py-20 text-center text-muted-foreground">
                        <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">Cette page est vide</p>
                        <Button onClick={() => setRightPanel('sections')}>
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter une section
                        </Button>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext items={sections.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                          {sections.map((section: any, index: number) => (
                            <DraggableSection
                              key={section.id}
                              section={section}
                              isSelected={selectedSectionId === section.id}
                              onSelect={() => {
                                setSelectedSectionId(section.id);
                                setEditingGlobalSection(null);
                              }}
                              onEdit={() => {
                                setEditingSection(section);
                                setEditingGlobalSection(null);
                                setRightPanel('editor');
                              }}
                              onDelete={() => handleDeleteSection(section.id)}
                              onDuplicate={() => handleDuplicateSection(section)}
                              onMoveUp={() => handleMoveSection(section.id, 'up')}
                              onMoveDown={() => handleMoveSection(section.id, 'down')}
                              isFirst={index === 0}
                              isLast={index === sections.length - 1}
                              onNavigate={(slug) => {
                                // Routes blog → ouvrir dans le preview dans un nouvel onglet
                                const clean = slug.replace(/\/$/, '');
                                if (clean === '/blog' || clean.startsWith('/blog/')) {
                                  window.open(previewUrl + clean, '_blank');
                                  return;
                                }
                                const target = pages.find((p: any) => p.slug === slug || p.slug === `/${slug.replace(/^\//, '')}`);
                                if (target) setCurrentPageId(target.id);
                              }}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>

                  {/* Global Footer */}
                  {footer && (
                    <div
                      className={cn(
                        "relative group cursor-pointer transition-all",
                        selectedSectionId === footer.id && "ring-2 ring-primary ring-inset"
                      )}
                      onClick={() => handleEditGlobalSection('footer')}
                    >
                      <div className="pointer-events-none">
                        <SectionRenderer
                          sectionTypeId={footer.sectionTypeId}
                          content={footer.content}
                          styles={footer.styles}
                        />
                      </div>
                      <div className="absolute inset-0 z-10 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-auto">
                        <Badge className="bg-primary text-white">Footer global - Cliquer pour éditer</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); setChangingGlobalSection('footer'); }}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Changer le style
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DeviceFrame>
            </div>
          </div>
        </main>

        {/* Right Sidebar (Desktop ≥ 1024px only) */}
        {isDesktop && (
          <aside className="w-80 border-l bg-card shrink-0 h-full z-10">
            {RightSidebarContent}
          </aside>
        )}
      </div>

      {/* Publish Dialog */}
      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        siteName={site.name}
        siteId={site.id}
        isPublished={site.status === 'published'}
        previewUrl={previewUrl}
        hasActiveDomain={domains.some((d: any) => d.type === 'custom' && ['active', 'verified'].includes(d.status))}
        activeDomain={domains.find((d: any) => d.type === 'custom' && ['active', 'verified'].includes(d.status))?.domain}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
      />

      {/* Change Global Section Type Dialog */}
      <Dialog open={!!changingGlobalSection} onOpenChange={(open) => !open && setChangingGlobalSection(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Changer le style {changingGlobalSection === 'navbar' ? 'de la navigation' : 'du pied de page'}
            </DialogTitle>
            <DialogDescription>
              Choisissez un nouveau style. Le contenu sera réinitialisé avec les valeurs par défaut.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-2 gap-4">
              {changingGlobalSection && getAvailableGlobalTypes(changingGlobalSection).map((st: any) => {
                const currentTypeId = changingGlobalSection === 'navbar' ? navbar?.sectionTypeId : footer?.sectionTypeId;
                const isCurrent = st.id === currentTypeId;
                return (
                  <button
                    key={st.id}
                    onClick={() => !isCurrent && handleChangeGlobalSectionType(st.id)}
                    className={cn(
                      "relative rounded-lg border-2 overflow-hidden text-left transition-all",
                      isCurrent
                        ? "border-primary ring-2 ring-primary/20 cursor-default"
                        : "border-muted hover:border-primary/50 cursor-pointer"
                    )}
                  >
                    <LiveSectionPreview sectionTypeId={st.id} thumbHeight={changingGlobalSection === 'navbar' ? 80 : 120} />
                    <div className="p-2 bg-card border-t flex items-center justify-between">
                      <span className="text-sm font-medium">{st.name}</span>
                      {isCurrent && <Badge variant="default" className="text-xs">Actuel</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
