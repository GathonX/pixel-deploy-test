import { useState, useMemo } from 'react';
import { Template, TemplatePage, TemplateSection } from '@/types/platform';
import { usePlatform } from '../../contexts/PlatformContext';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent } from '../ui/dialog';
import { X, Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Badge } from '../ui/badge';
import { renderSection as renderRegistrySection } from '../editor/sections/sectionRegistry';

export function TemplatePreview({ template, open, onOpenChange, onUseTemplate }: TemplatePreviewProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const { sectionTypes } = usePlatform();

  // Get pages for this template (from API via template prop)
  const pages = useMemo(() => {
    return (template.pages || []).sort((a: any, b: any) => a.order - b.order);
  }, [template.pages]);

  const currentPage = pages[currentPageIndex];

  // Get sections for current page (from API via template.pages)
  const sections = useMemo(() => {
    if (!currentPage) return [];
    return (currentPage.sections || []).sort((a: any, b: any) => a.order - b.order);
  }, [currentPage]);

  // Separate navbar from content sections so navbar renders outside ScrollArea (dropdown not clipped)
  const navbarSection = useMemo(() =>
    sections.find(s => s.sectionTypeId === 'navbar' || s.sectionTypeId === 'navbar-premium' || s.sectionTypeId === 'navbar-premium-v2' || s.sectionTypeId === 'navbar-premium-v3' || s.sectionTypeId === 'navbar-premium-v4' || s.sectionTypeId === 'navbar-premium-v5'),
    [sections]
  );
  const contentSections = useMemo(() =>
    sections.filter(s => s.sectionTypeId !== 'navbar' && s.sectionTypeId !== 'navbar-premium' && s.sectionTypeId !== 'navbar-premium-v2' && s.sectionTypeId !== 'navbar-premium-v3' && s.sectionTypeId !== 'navbar-premium-v4' && s.sectionTypeId !== 'navbar-premium-v5'),
    [sections]
  );

  // Navigate between pages by slug
  const handleNavigate = (slug: string) => {
    const normalized = slug.replace(/^[/#]+/, '').split('?')[0].split('#')[0];
    const targetIndex = pages.findIndex((page: any) => {
      const pageSlug = (page.slug || '').replace(/^\//, '');
      return pageSlug === normalized || page.name.toLowerCase() === normalized.toLowerCase();
    });
    if (targetIndex >= 0) {
      setCurrentPageIndex(targetIndex);
    }
  };

  // Event delegation: intercept all <a> clicks inside preview for page navigation
  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('http')) {
        e.preventDefault();
        handleNavigate(href);
      }
    }
  };

  const viewportWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px'
  };

  const renderSection = (templateSection: TemplateSection) => {
    const sectionType = sectionTypes.find(st => st.id === templateSection.sectionTypeId);
    if (!sectionType) return null;

    const content = { ...sectionType.defaultContent, ...templateSection.defaultContent };
    const styles = { ...sectionType.defaultStyles, ...templateSection.defaultStyles };

    return renderRegistrySection(templateSection.sectionTypeId, content, styles, handleNavigate, templateSection.id) ?? (
      <div key={templateSection.id} className="p-8 bg-muted text-center">
        <p className="text-muted-foreground">Section: {templateSection.sectionTypeId}</p>
      </div>
    );
  };

  const handlePrevPage = () => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h2 className="font-semibold">{template.name}</h2>
                <p className="text-xs text-muted-foreground">{template.category}</p>
              </div>
              {template.isPremium ? (
                <div className="flex items-center gap-1">
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                    <Crown className="w-3 h-3" />
                    Premium - {template.price}€
                  </Badge>
                  {template.priceAriary != null && (
                    <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px]">
                      {template.priceAriary.toLocaleString('fr-FR')} Ar
                    </Badge>
                  )}
                </div>
              ) : (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">
                  Gratuit
                </Badge>
              )}
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-1">
              {pages.map((page, index) => (
                <Button
                  key={page.id}
                  variant={currentPageIndex === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPageIndex(index)}
                  className="min-w-[80px]"
                >
                  {page.name}
                </Button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNextPage}
              disabled={currentPageIndex === pages.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Viewport Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewport('desktop')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewport('tablet')}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewport('mobile')}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => onUseTemplate(template)}>
              {template.isPremium ? (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  Acheter - {template.price}€ / {template.priceAriary?.toLocaleString('fr-FR')} Ar
                </>
              ) : (
                'Utiliser ce template'
              )}
            </Button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-muted/50 overflow-hidden flex items-start justify-center p-4">
          <div
            className="bg-white shadow-2xl rounded-lg transition-all duration-300 h-full flex flex-col overflow-hidden"
            style={{
              width: viewportWidth[viewport],
              maxWidth: '100%'
            }}
          >
            {/* Navbar rendered OUTSIDE ScrollArea so dropdown menus are not clipped */}
            {navbarSection && (
              <div className="shrink-0 relative z-20" style={{ overflow: 'visible' }}>
                {renderSection(navbarSection)}
              </div>
            )}

            {/* Scrollable content area with event delegation for link navigation */}
            <ScrollArea className="flex-1">
              <div className="min-h-full" onClick={handlePreviewClick}>
                {contentSections.map((section) => (
                  <div key={section.id}>
                    {renderSection(section)}
                  </div>
                ))}
                {sections.length === 0 && (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    Aucune section configurée pour cette page
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-card shrink-0 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPageIndex + 1} sur {pages.length} • {sections.length} sections
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={() => onUseTemplate(template)}>
              {template.isPremium ? (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  Acheter - {template.price}€ / {template.priceAriary?.toLocaleString('fr-FR')} Ar
                </>
              ) : (
                'Utiliser ce template'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
