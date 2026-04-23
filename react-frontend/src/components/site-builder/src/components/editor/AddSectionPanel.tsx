import { usePlatform } from '../../contexts/PlatformContext';
import { sectionVariants } from '../../data/sectionVariants';
import { LiveSectionPreview, LiveSectionPreviewHover } from './previews/LiveSectionPreview';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Plus, Search, Check, ArrowLeft, ChevronDown, Hotel, Sparkles, Layers } from 'lucide-react';
import { useState, useRef, useMemo } from 'react';

interface AddSectionPanelProps {
  onAddSection: (sectionTypeId: string, variantStyles?: Record<string, any>) => void;
  /** Prefix extracted from site.sourceTemplateId, e.g. 'luxios' from 'luxios-hotel' */
  templateFamily?: string;
  /** Display name of the template, e.g. 'Luxios Hotel & Resort' */
  templateName?: string;
}

const sectionPreviews: Record<string, React.ReactNode> = {};

/** Accent color per template family */
const TEMPLATE_ACCENT: Record<string, string> = {
  luxios: '#c99645',
};

/** Icon per template family */
const TEMPLATE_ICON: Record<string, any> = {
  luxios: Hotel,
};

export function AddSectionPanel({ onAddSection, templateFamily, templateName }: AddSectionPanelProps) {
  const { sectionTypes } = usePlatform();

  // Build categories dynamically from sectionTypes filtered by the current template family.
  // Sections whose ID contains 'navbar' or 'footer' are grouped as "Structure"; the rest as "Contenu".
  const sectionCategories = useMemo(() => {
    if (!templateFamily || !(sectionTypes as any[])?.length) return [];
    const prefix = templateFamily + '-';
    const familyTypes = (sectionTypes as any[]).filter((st: any) => st.id.startsWith(prefix));
    const structureIds = familyTypes.filter((st: any) => st.id.includes('navbar') || st.id.includes('footer')).map((st: any) => st.id);
    const contentIds = familyTypes.filter((st: any) => !st.id.includes('navbar') && !st.id.includes('footer')).map((st: any) => st.id);
    const accent = TEMPLATE_ACCENT[templateFamily] ?? '#6366f1';
    const Icon = TEMPLATE_ICON[templateFamily] ?? Layers;
    const label = templateName || templateFamily;
    const cats: Array<{ id: string; label: string; icon: any; accent: string; types: string[] }> = [];
    if (structureIds.length > 0) cats.push({ id: `${templateFamily}-structure`, label: `${label} — Structure`, icon: Icon, accent, types: structureIds });
    if (contentIds.length > 0)  cats.push({ id: `${templateFamily}-content`,   label: `${label} — Contenu`,   icon: Sparkles, accent, types: contentIds });
    return cats;
  }, [templateFamily, templateName, sectionTypes]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const hoveredCardRef = useRef<HTMLDivElement | null>(null);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setOpenCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filteredCategories = sectionCategories.map(cat => ({
    ...cat,
    types: cat.types.filter(typeId => {
      const sectionType = sectionTypes.find((st: any) => st.id === typeId);
      if (!sectionType) return false;
      if (!searchQuery) return true;
      return sectionType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             typeId.toLowerCase().includes(searchQuery.toLowerCase());
    })
  })).filter(cat => cat.types.length > 0);

  const handleSelectSection = (typeId: string) => {
    const variants = sectionVariants.find(sv => sv.sectionTypeId === typeId);
    if (variants && variants.variants.length > 0) {
      setSelectedSection(typeId);
      setSelectedVariant(variants.variants[0].id);
    } else {
      onAddSection(typeId);
    }
  };

  const handleAddWithVariant = () => {
    if (!selectedSection) return;
    
    const variants = sectionVariants.find(sv => sv.sectionTypeId === selectedSection);
    const variant = variants?.variants.find(v => v.id === selectedVariant);
    
    if (variant) {
      onAddSection(selectedSection, variant.styles);
    } else {
      onAddSection(selectedSection);
    }
    
    setSelectedSection(null);
    setSelectedVariant(null);
  };

  const currentSectionType = selectedSection 
    ? sectionTypes.find((st: any) => st.id === selectedSection) 
    : null;
  
  const currentVariants = selectedSection 
    ? sectionVariants.find(sv => sv.sectionTypeId === selectedSection)?.variants || []
    : [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold">Ajouter une section</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {filteredCategories.map((category) => {
            const isOpen = searchQuery ? true : openCategories.includes(category.id);
            const CategoryIcon = category.icon;
            const isPremiumCat = category.id.startsWith('premium');

            return (
              <Collapsible
                key={category.id}
                open={isOpen}
                onOpenChange={() => !searchQuery && toggleCategory(category.id)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      hover:bg-muted/80
                      ${isOpen ? 'bg-muted/60' : ''}
                      ${isPremiumCat ? 'border border-dashed' : ''}
                    `}
                    style={isPremiumCat ? { borderColor: `${category.accent}40` } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        className="w-4 h-4"
                        style={isPremiumCat ? { color: category.accent } : undefined}
                      />
                      <span>{category.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                        {category.types.length}
                      </Badge>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-2 pt-2 pb-3 px-1">
                    {category.types.map((typeId) => {
                      const sectionType = sectionTypes.find((st: any) => st.id === typeId);
                      if (!sectionType) return null;

                      const isHovered = hoveredSection === typeId;
                      const variants = sectionVariants.find(sv => sv.sectionTypeId === typeId);
                      const variantCount = variants?.variants.length || 0;

                      return (
                        <div
                          key={typeId}
                          className={`
                            relative rounded-lg border cursor-pointer transition-all overflow-hidden
                            ${isHovered ? 'border-primary shadow-lg scale-[1.02]' : 'border-border hover:border-primary/50'}
                          `}
                          onMouseEnter={() => setHoveredSection(typeId)}
                          onMouseLeave={() => setHoveredSection(null)}
                          onClick={() => handleSelectSection(typeId)}
                        >
                          {/* Mini Preview */}
                          <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                            {sectionPreviews[typeId]}
                            {/* Hover overlay */}
                            <div className={`
                              absolute inset-0 bg-primary/90 flex items-center justify-center transition-opacity
                              ${isHovered ? 'opacity-100' : 'opacity-0'}
                            `}>
                              <Plus className="w-6 h-6 text-white" />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="p-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-xs">{sectionType.name}</span>
                              {variantCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                  {variantCount} styles
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune section trouvée</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          💡 Cliquez pour choisir un style puis ajouter
        </p>
      </div>

      {/* Variant Selection Dialog */}
      <Dialog open={!!selectedSection} onOpenChange={(open) => { if (!open) { setSelectedSection(null); setHoveredVariantId(null); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedSection(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Choisir un style - {currentSectionType?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto p-1">
            {currentVariants.map((variant) => (
              <div
                key={variant.id}
                className={`
                  relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden group
                  ${selectedVariant === variant.id
                    ? 'border-primary ring-2 ring-primary/20 scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:shadow-lg'}
                `}
                onClick={() => setSelectedVariant(variant.id)}
                onMouseEnter={(e) => {
                  hoveredCardRef.current = e.currentTarget;
                  setHoveredVariantId(variant.id);
                }}
                onMouseLeave={() => setHoveredVariantId(null)}
              >
                {/* Live Section Preview */}
                <div className="w-full overflow-hidden">
                  {selectedSection && (
                    <LiveSectionPreview
                      sectionTypeId={selectedSection}
                      variant={variant}
                      thumbHeight={120}
                    />
                  )}
                </div>

                {/* Selection indicator overlay */}
                {selectedVariant === variant.id && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Info */}
                <div className="p-2 bg-card border-t">
                  <span className="font-medium text-xs block">{variant.name}</span>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {variant.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedSection(null)}>
              Annuler
            </Button>
            <Button onClick={handleAddWithVariant}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter cette section
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hover preview popup */}
      {hoveredVariantId && selectedSection && (() => {
        const hVariant = currentVariants.find(v => v.id === hoveredVariantId);
        if (!hVariant) return null;
        return (
          <LiveSectionPreviewHover
            sectionTypeId={selectedSection}
            variant={hVariant}
            show={true}
            anchorRef={hoveredCardRef}
          />
        );
      })()}
    </div>
  );
}
