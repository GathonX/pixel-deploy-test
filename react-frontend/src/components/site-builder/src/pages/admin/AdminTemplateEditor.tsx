import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlatform } from '../../contexts/PlatformContext';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Layers,
  Settings,
  Eye,
  Upload,
  ImageIcon,
  ArrowUp,
  ArrowDown,
  Crown,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadTemplateImage } from '../../services/siteBuilderService';
import { Template, TemplatePage, TemplateSection } from '@/types/platform';

export default function AdminTemplateEditor({ embedded, basePath = '/site-builder/admin' }: { embedded?: boolean; basePath?: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    templates,
    templatePages: allTemplatePages,
    templateSections: allTemplateSections,
    sectionTypes,
    addTemplate,
    updateTemplate,
    addTemplatePage,
    updateTemplatePage,
    deleteTemplatePage,
    addTemplateSection,
    updateTemplateSection,
    deleteTemplateSection
  } = usePlatform();

  const isNew = id === 'new';
  const existingTemplate = templates.find(t => t.id === id);

  const [template, setTemplate] = useState<Partial<Template>>({
    name: '',
    description: '',
    category: 'Business',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    version: '1.0.0',
    status: 'draft',
    isPremium: false,
    price: null,
    priceAriary: null,
  });

  const [templatePages, setTemplatePages] = useState<TemplatePage[]>([]);
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (existingTemplate) {
      setTemplate(existingTemplate);
      const pages = allTemplatePages.filter(p => p.templateId === existingTemplate.id);
      setTemplatePages(pages);
      if (pages.length > 0 && !selectedPageId) {
        setSelectedPageId(pages[0].id);
      }
      const sections = allTemplateSections.filter(s =>
        pages.some(p => p.id === s.templatePageId)
      );
      setTemplateSections(sections);
    }
  }, [existingTemplate, allTemplatePages, allTemplateSections]);

  const selectedPageSections = templateSections
    .filter(s => s.templatePageId === selectedPageId)
    .sort((a, b) => a.order - b.order);

  const handleSave = async () => {
    if (!template.name) {
      toast.error('Le nom du template est requis');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const payload: any = {
          name: template.name,
          description: template.description || '',
          category: template.category || 'Business',
          thumbnail: template.thumbnail || '',
          version: template.version || '1.0.0',
          status: template.status || 'draft',
          is_premium: template.isPremium || false,
          price: template.isPremium ? (template.price || 0) : null,
          price_ariary: template.isPremium ? (template.priceAriary || 0) : null,
        };
        const newTemplate = await addTemplate(payload);
        if (newTemplate) {
          toast.success('Template créé avec succès');
          navigate(`${basePath}/templates/${newTemplate.id}`);
        }
      } else {
        await updateTemplate(id!, template);
        toast.success('Template mis à jour');
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPage = async () => {
    if (!existingTemplate) {
      toast.error('Sauvegardez d\'abord le template');
      return;
    }
    const newPage = await addTemplatePage(existingTemplate.id, {
      name: `Nouvelle page ${templatePages.length + 1}`,
      slug: `/page-${templatePages.length + 1}`,
      order: templatePages.length
    });
    if (newPage) {
      setTemplatePages(prev => [...prev, newPage]);
      setSelectedPageId(newPage.id);
      toast.success('Page ajoutée');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    await deleteTemplatePage(pageId);
    setTemplatePages(prev => prev.filter(p => p.id !== pageId));
    setTemplateSections(prev => prev.filter(s => s.templatePageId !== pageId));
    if (selectedPageId === pageId) {
      const remaining = templatePages.filter(p => p.id !== pageId);
      setSelectedPageId(remaining.length > 0 ? remaining[0].id : null);
    }
    toast.success('Page supprimée');
  };

  const handleAddSection = async (sectionTypeId: string) => {
    if (!selectedPageId) {
      toast.error('Sélectionnez une page');
      return;
    }
    const newSection = await addTemplateSection(selectedPageId, sectionTypeId, selectedPageSections.length);
    if (newSection) {
      setTemplateSections(prev => [...prev, newSection]);
      toast.success('Section ajoutée');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    await deleteTemplateSection(sectionId);
    setTemplateSections(prev => prev.filter(s => s.id !== sectionId));
    toast.success('Section supprimée');
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const section = templateSections.find(s => s.id === sectionId);
    if (!section) return;

    const pageSections = templateSections
      .filter(s => s.templatePageId === section.templatePageId)
      .sort((a, b) => a.order - b.order);

    const currentIndex = pageSections.findIndex(s => s.id === sectionId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= pageSections.length) return;

    const otherSection = pageSections[newIndex];

    // Update locally
    setTemplateSections(prev => prev.map(s => {
      if (s.id === sectionId) return { ...s, order: otherSection.order };
      if (s.id === otherSection.id) return { ...s, order: section.order };
      return s;
    }));

    // Update on backend
    updateTemplateSection(sectionId, { order: otherSection.order });
    updateTemplateSection(otherSection.id, { order: section.order });
  };

  const categories = ['SaaS', 'Portfolio', 'Restaurant', 'Business', 'E-commerce', 'Tech', 'Blog', 'Agency', 'Sport', 'Santé', 'Éducation', 'Voyage', 'Immobilier', 'Mode', 'Musique', 'Événementiel'];

  // Separate section types into free and premium for the dropdown
  const freeSectionTypes = sectionTypes.filter(t => !t.id.endsWith('-premium'));
  const premiumSectionTypes = sectionTypes.filter(t => t.id.endsWith('-premium'));

  return (
    <AdminLayout
      title={isNew ? 'Nouveau template' : template.name || 'Éditer template'}
      embedded={embedded}
      breadcrumbs={[
        { label: 'Templates', href: `${basePath}/templates` },
        { label: isNew ? 'Nouveau' : template.name || '' }
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {isNew ? 'Nouveau template' : 'Éditer le template'}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? 'Créez un nouveau template pour vos utilisateurs' : 'Modifiez les paramètres et la structure du template'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(`${basePath}/templates`)}>
              Retour
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="pages" className="gap-2" disabled={isNew}>
              <FileText className="w-4 h-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="sections" className="gap-2" disabled={isNew || templatePages.length === 0}>
              <Layers className="w-4 h-4" />
              Sections
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du template *</Label>
                    <Input
                      id="name"
                      value={template.name || ''}
                      onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Landing Page Pro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={template.category}
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={template.description || ''}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez ce template..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Image du template</Label>
                  <div className="flex gap-4">
                    {/* Upload zone */}
                    <label
                      className="flex flex-col items-center justify-center w-64 h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors relative overflow-hidden"
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload en cours...</span>
                        </div>
                      ) : template.thumbnail ? (
                        <>
                          <img
                            src={template.thumbnail}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Changer l'image</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-4">
                          <ImageIcon className="w-10 h-10 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground text-center">
                            Cliquez ou glissez une image ici
                          </span>
                          <span className="text-xs text-muted-foreground">
                            JPG, PNG, GIF, WebP (max 5 Mo)
                          </span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('L\'image ne doit pas dépasser 5 Mo');
                            return;
                          }
                          setUploading(true);
                          try {
                            const result = await uploadTemplateImage(file);
                            setTemplate(prev => ({ ...prev, thumbnail: result.path }));
                            toast.success('Image uploadée');
                          } catch {
                            toast.error('Erreur lors de l\'upload');
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>

                    {/* Right side: URL input + metadata */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="thumbnail" className="text-xs text-muted-foreground">Ou collez une URL</Label>
                        <Input
                          id="thumbnail"
                          value={template.thumbnail || ''}
                          onChange={(e) => setTemplate(prev => ({ ...prev, thumbnail: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="version">Version</Label>
                          <Input
                            id="version"
                            value={template.version || ''}
                            onChange={(e) => setTemplate(prev => ({ ...prev, version: e.target.value }))}
                            placeholder="1.0.0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Statut</Label>
                          <Select
                            value={template.status}
                            onValueChange={(value: any) => setTemplate(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Brouillon</SelectItem>
                              <SelectItem value="active">Actif</SelectItem>
                              <SelectItem value="archived">Archivé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium / Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  Tarification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold">Template Premium</Label>
                    <p className="text-sm text-muted-foreground">
                      Activez cette option pour rendre ce template payant
                    </p>
                  </div>
                  <Switch
                    checked={template.isPremium || false}
                    onCheckedChange={(checked) => setTemplate(prev => ({
                      ...prev,
                      isPremium: checked,
                      price: checked ? (prev.price || 0) : null,
                      priceAriary: checked ? (prev.priceAriary || 0) : null,
                    }))}
                  />
                </div>

                {template.isPremium && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="flex items-center gap-1">
                        Prix en Euro (€)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={template.price || ''}
                        onChange={(e) => setTemplate(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceAriary" className="flex items-center gap-1">
                        Prix en Ariary (Ar)
                      </Label>
                      <Input
                        id="priceAriary"
                        type="number"
                        min="0"
                        step="1"
                        value={template.priceAriary || ''}
                        onChange={(e) => setTemplate(prev => ({ ...prev, priceAriary: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {/* Badge preview */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground">Badge affiché :</Label>
                  {template.isPremium ? (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                      <Crown className="w-3 h-3" />
                      Premium — {template.price || 0}€ / {(template.priceAriary || 0).toLocaleString('fr-FR')} Ar
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                      Gratuit
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pages du template</CardTitle>
                <Button onClick={handleAddPage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une page
                </Button>
              </CardHeader>
              <CardContent>
                {templatePages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune page. Cliquez sur "Ajouter une page" pour commencer.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templatePages.sort((a, b) => a.order - b.order).map((page) => (
                      <div
                        key={page.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <Input
                            value={page.name}
                            onChange={(e) => {
                              setTemplatePages(prev => prev.map(p =>
                                p.id === page.id ? { ...p, name: e.target.value } : p
                              ));
                            }}
                            onBlur={(e) => {
                              updateTemplatePage(page.id, { name: e.target.value });
                            }}
                            placeholder="Nom de la page"
                          />
                          <Input
                            value={page.slug}
                            onChange={(e) => {
                              setTemplatePages(prev => prev.map(p =>
                                p.id === page.id ? { ...p, slug: e.target.value } : p
                              ));
                            }}
                            onBlur={(e) => {
                              updateTemplatePage(page.id, { slug: e.target.value });
                            }}
                            placeholder="/slug"
                          />
                        </div>
                        <Badge variant="outline">
                          {templateSections.filter(s => s.templatePageId === page.id).length} sections
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePage(page.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Page selector */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {templatePages.map((page) => (
                    <Button
                      key={page.id}
                      variant={selectedPageId === page.id ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {page.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Sections list */}
              <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Sections — {templatePages.find(p => p.id === selectedPageId)?.name}
                  </CardTitle>
                  <Select onValueChange={handleAddSection}>
                    <SelectTrigger className="w-[240px]">
                      <Plus className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Ajouter section" />
                    </SelectTrigger>
                    <SelectContent>
                      {freeSectionTypes.length > 0 && (
                        <>
                          <SelectItem value="__header_free" disabled className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                            — Sections gratuites —
                          </SelectItem>
                          {freeSectionTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </>
                      )}
                      {premiumSectionTypes.length > 0 && (
                        <>
                          <SelectItem value="__header_premium" disabled className="font-semibold text-xs uppercase tracking-wider text-amber-600">
                            — Sections premium —
                          </SelectItem>
                          {premiumSectionTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              <span className="flex items-center gap-2">
                                <Crown className="w-3 h-3 text-amber-500" />
                                {type.name}
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {selectedPageSections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucune section. Ajoutez des sections à cette page.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPageSections.map((section, index) => {
                        const sType = sectionTypes.find(t => t.id === section.sectionTypeId);
                        const isPrem = section.sectionTypeId?.endsWith('-premium');
                        return (
                          <div
                            key={section.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isPrem ? 'border-amber-500/20 bg-amber-500/5' : ''}`}
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                            <Badge variant="outline">{index + 1}</Badge>
                            <span className="flex-1 font-medium flex items-center gap-2">
                              {isPrem && <Crown className="w-3 h-3 text-amber-500" />}
                              {sType?.name || section.sectionTypeId}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMoveSection(section.id, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMoveSection(section.id, 'down')}
                                disabled={index === selectedPageSections.length - 1}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDeleteSection(section.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
