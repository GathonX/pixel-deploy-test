import { Section } from '@/types/platform';
import { usePlatform } from '../../contexts/PlatformContext';
import { SiteBuilderUploadContext } from '../../contexts/SiteBuilderUploadContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ImageUploader } from '../ui/image-uploader';
import { X, Type, Palette, Layout, ChevronDown, Plus, Trash2, GripVertical, Link, Image, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { renderSectionEditor, isSectionRegistered } from './sections/sectionRegistry';

interface EnhancedSectionEditorProps {
  section: Section;
  onUpdate: (content: Record<string, unknown>, styles: Record<string, unknown>) => void;
  onClose: () => void;
}

export function EnhancedSectionEditor({ section, onUpdate, onClose }: EnhancedSectionEditorProps) {
  const {
    sectionTypes,
    activeLang, setActiveLang,
    siteLangs, loadSiteLangs,
    getSiteIdByPageId,
    updateSectionTranslation,
  } = usePlatform() as any;

  const sectionType = sectionTypes.find((st: any) => st.id === section.sectionTypeId);
  const styles = section.styles as Record<string, any>;
  const defaultStyles = sectionType?.defaultStyles || {};
  const effectiveStyles = { ...defaultStyles, ...styles };
  // A section is "registry-managed" if it has a dedicated renderer (Luxios, future templates).
  // Registry sections use inline styles — hide the generic CSS-variable style controls for them.
  const isRegistrySection = isSectionRegistered(section.sectionTypeId);
  const isPremium = isRegistrySection; // registry sections expose accent-color control
  const isLuxios = isRegistrySection;  // reuse same flag: hides columns/centered/opacity for inline-style sections
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Charger les langues du site au premier rendu
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  useEffect(() => {
    const siteId = getSiteIdByPageId(section.pageId);
    if (siteId) { setCurrentSiteId(siteId); loadSiteLangs(siteId); }
  }, [section.pageId]);

  // Langue par défaut et mode traduction
  const defaultLang = (siteLangs as any[]).find((l: any) => l.isDefault)?.code ?? '';
  const isTranslating = activeLang && activeLang !== '' && activeLang !== defaultLang;

  // Contenu affiché dans l'éditeur : traduction active ou contenu par défaut
  const baseContent = section.content as Record<string, any>;
  const translations = (section.translations ?? {}) as Record<string, Record<string, any>>;
  const content: Record<string, any> = isTranslating
    ? { ...baseContent, ...(translations[activeLang] ?? {}) }
    : baseContent;

  // Sauvegarder selon la langue active
  const updateContent = (key: string, value: any) => {
    if (isTranslating) {
      updateSectionTranslation(section.id, activeLang, { ...content, [key]: value });
    } else {
      onUpdate({ ...baseContent, [key]: value }, styles);
    }
  };

  const updateStyle = (key: string, value: any) => {
    onUpdate(baseContent, { ...styles, [key]: value });
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Reusable array item editor with image upload support
  const renderArrayEditor = (
    items: any[], 
    key: string, 
    fields: { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'select' | 'image'; options?: string[] }[],
    addLabel: string = 'Ajouter'
  ) => {
    const addItem = () => {
      const newItem: Record<string, any> = {};
      fields.forEach(f => { newItem[f.key] = ''; });
      updateContent(key, [...items, newItem]);
    };

    const removeItem = (index: number) => {
      updateContent(key, items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: value };
      updateContent(key, newItems);
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{key.charAt(0).toUpperCase() + key.slice(1)} ({items.length})</span>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="w-3 h-3 mr-1" />
            {addLabel}
          </Button>
        </div>
        {items.map((item, i) => (
          <Collapsible 
            key={i} 
            open={openItems.includes(`${key}-${i}`)}
            onOpenChange={() => toggleItem(`${key}-${i}`)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {/* Show thumbnail for image items */}
                    {(item.image || item.url || item.avatar) && (
                      <img 
                        src={item.image || item.url || item.avatar} 
                        alt="" 
                        className="w-8 h-8 rounded object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span className="text-sm font-medium">
                      {item.title || item.name || item.label || item.question || `Élément ${i + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openItems.includes(`${key}-${i}`) ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 pt-0 space-y-3 border-t">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={item[field.key] || ''}
                          onChange={(e) => updateItem(i, field.key, e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                      ) : field.type === 'select' && field.options ? (
                        <Select
                          value={item[field.key] || field.options[0]}
                          onValueChange={(v) => updateItem(i, field.key, v)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'image' ? (
                        <ImageUploader
                          value={item[field.key] || ''}
                          onChange={(url) => updateItem(i, field.key, url)}
                          placeholder="URL ou uploadez une image"
                        />
                      ) : (
                        <Input
                          value={item[field.key] || ''}
                          onChange={(e) => updateItem(i, field.key, e.target.value)}
                          className="text-sm"
                          type={field.type === 'url' ? 'url' : 'text'}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    );
  };

  const renderContentEditor = () => {
    // Registry handles all self-contained section types (Luxios, future templates)
    const registryEditor = renderSectionEditor(section.sectionTypeId, content, updateContent);
    if (registryEditor) return registryEditor;

    // Generic fallback for unknown section types
    return (
      <div className="space-y-2">
        <Label>Titre</Label>
        <Input
          value={content.title || ''}
          onChange={(e) => updateContent('title', e.target.value)}
        />
      </div>
    );
  };

  return (
    <SiteBuilderUploadContext.Provider value={currentSiteId}>
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{sectionType?.name || 'Section'}</h3>
          <p className="text-xs text-muted-foreground">ID: {section.id.slice(0, 8)}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Raccourci langues — visible si le site n'a qu'une langue */}
      {(siteLangs as any[]).length <= 1 && currentSiteId && (
        <a
          href={`/dashboard/site/${currentSiteId}/languages`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-1.5 border-b bg-slate-50 hover:bg-slate-100 transition-colors shrink-0 group"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 group-hover:text-slate-700">Site en 1 langue —</span>
          <span className="text-xs text-indigo-600 font-medium group-hover:underline">Gérer les langues →</span>
        </a>
      )}

      {/* Switcher de langue — visible uniquement si le site a plusieurs langues */}
      {(siteLangs as any[]).length > 1 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b bg-slate-50 flex-wrap shrink-0">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {(siteLangs as any[]).map((lang: any) => (
            <button
              key={lang.code}
              onClick={() => setActiveLang(lang.code)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                activeLang === lang.code
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.isDefault && <span className="opacity-60 text-[10px]">(défaut)</span>}
            </button>
          ))}
          {isTranslating && (
            <span className="ml-auto text-[10px] text-amber-600 font-medium">
              Traduction {activeLang.toUpperCase()}
            </span>
          )}
        </div>
      )}

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b px-4 shrink-0 overflow-x-auto">
          <TabsTrigger value="content" className="gap-2 shrink-0" title="Contenu - Modifier les textes et médias">
            <Type className="w-4 h-4" />
            Contenu
          </TabsTrigger>
          <TabsTrigger value="style" className="gap-2 shrink-0" title="Style - Couleurs et apparence">
            <Palette className="w-4 h-4" />
            Style
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2 shrink-0" title="Layout - Mise en page et espacement">
            <Layout className="w-4 h-4" />
            Layout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-4">
              {renderContentEditor()}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="style" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Couleur de fond</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={effectiveStyles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={effectiveStyles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Couleur du texte</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={effectiveStyles.textColor || '#000000'}
                    onChange={(e) => updateStyle('textColor', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={effectiveStyles.textColor || '#000000'}
                    onChange={(e) => updateStyle('textColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Accent Color - shown for premium sections */}
              {isPremium && (
                <div className="space-y-2">
                  <Label>Couleur d'accent</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={effectiveStyles.accentColor || '#8b5cf6'}
                      onChange={(e) => updateStyle('accentColor', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={effectiveStyles.accentColor || '#8b5cf6'}
                      onChange={(e) => updateStyle('accentColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Couleur des boutons, icônes et accents visuels</p>
                </div>
              )}

              {!isLuxios && (
                <>
                  <Separator />

                  <div className="space-y-2">
                    <Label>Opacité de fond</Label>
                    <Slider
                      value={[effectiveStyles.backgroundOpacity || 100]}
                      onValueChange={(v) => updateStyle('backgroundOpacity', v[0])}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <span className="text-xs text-muted-foreground">{effectiveStyles.backgroundOpacity || 100}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Activer le gradient</Label>
                    <Switch
                      checked={effectiveStyles.gradient || false}
                      onCheckedChange={(v) => updateStyle('gradient', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ombre</Label>
                    <Select
                      value={effectiveStyles.shadow || 'none'}
                      onValueChange={(v) => updateStyle('shadow', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        <SelectItem value="sm">Légère</SelectItem>
                        <SelectItem value="md">Moyenne</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                        <SelectItem value="xl">Très grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Bordure arrondie</Label>
                    <Select
                      value={effectiveStyles.borderRadius || 'none'}
                      onValueChange={(v) => updateStyle('borderRadius', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        <SelectItem value="sm">Légère</SelectItem>
                        <SelectItem value="md">Moyenne</SelectItem>
                        <SelectItem value="lg">Grande</SelectItem>
                        <SelectItem value="full">Complète</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="layout" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Padding vertical</Label>
                <Slider
                  value={[parseInt(effectiveStyles.paddingY) || 64]}
                  onValueChange={(v) => updateStyle('paddingY', v[0])}
                  min={16}
                  max={128}
                  step={8}
                />
                <span className="text-xs text-muted-foreground">{effectiveStyles.paddingY || 64}px</span>
              </div>

              <div className="space-y-2">
                <Label>Padding horizontal</Label>
                <Slider
                  value={[parseInt(effectiveStyles.paddingX) || 32]}
                  onValueChange={(v) => updateStyle('paddingX', v[0])}
                  min={16}
                  max={128}
                  step={8}
                />
                <span className="text-xs text-muted-foreground">{effectiveStyles.paddingX || 32}px</span>
              </div>

              <Separator />

              {!isLuxios && (
                <div className="space-y-2">
                  <Label>Colonnes</Label>
                  <Select
                    value={String(effectiveStyles.columns || 3)}
                    onValueChange={(v) => updateStyle('columns', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 colonne</SelectItem>
                      <SelectItem value="2">2 colonnes</SelectItem>
                      <SelectItem value="3">3 colonnes</SelectItem>
                      <SelectItem value="4">4 colonnes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Largeur maximale</Label>
                <Select
                  value={effectiveStyles.maxWidth || 'default'}
                  onValueChange={(v) => updateStyle('maxWidth', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Par défaut</SelectItem>
                    <SelectItem value="sm">Petite (640px)</SelectItem>
                    <SelectItem value="md">Moyenne (768px)</SelectItem>
                    <SelectItem value="lg">Grande (1024px)</SelectItem>
                    <SelectItem value="xl">Très grande (1280px)</SelectItem>
                    <SelectItem value="full">Pleine largeur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isLuxios && (
                <div className="flex items-center justify-between">
                  <Label>Contenu centré</Label>
                  <Switch
                    checked={effectiveStyles.centered !== false}
                    onCheckedChange={(v) => updateStyle('centered', v)}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
    </SiteBuilderUploadContext.Provider>
  );
}
