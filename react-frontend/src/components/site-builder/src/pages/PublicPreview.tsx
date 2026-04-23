import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePlatform } from '../contexts/PlatformContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertCircle, Eye, Lock } from 'lucide-react';
import { renderSection as renderRegistrySection } from '../components/editor/sections/sectionRegistry';
import { luxiosLangStore } from '../components/editor/sections/luxios/luxiosLangStore';

interface PublicPreviewParams {
  userId: string;
  templateName: string;
  siteName: string;
  token: string;
}

export default function PublicPreview() {
  const { userId, templateName, siteName, token } = useParams<PublicPreviewParams>();
  const { sites, isLoading, getSitePages, getPageSections, getSiteNavbar, getSiteFooter, templates, sectionTypes, loadSiteLangs } = usePlatform() as any;
  const [activeLang, setActiveLangState] = useState(() => luxiosLangStore.get());
  useEffect(() => luxiosLangStore.subscribe(() => setActiveLangState(luxiosLangStore.get())), []);

  // Find site by preview token
  const site = sites.find((s: any) => s.previewToken === token);

  useEffect(() => {
    if (site?.id) loadSiteLangs(site.id);
  }, [site?.id]);
  const pages = site ? getSitePages(site.id) : [];
  const navbar = site ? getSiteNavbar(site.id) : null;
  const footer = site ? getSiteFooter(site.id) : null;

  const [currentPageSlug, setCurrentPageSlug] = useState('/');

  const currentPage = useMemo(() => {
    return pages.find(p => p.slug === currentPageSlug) || pages[0];
  }, [pages, currentPageSlug]);

  const handleNavigate = (slug: string) => {
    const normalized = slug.replace(/^[/#]+/, '').split('?')[0].split('#')[0];
    setCurrentPageSlug(normalized === '' ? '/' : `/${normalized}`);
  };

  // Event delegation: intercept all <a> clicks for page navigation
  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('http')) {
        e.preventDefault();
        const normalized = href.replace(/^[/#]+/, '').split('?')[0].split('#')[0];
        setCurrentPageSlug(normalized === '' ? '/' : `/${normalized}`);
      }
    }
  };

  const sections = currentPage ? getPageSections(currentPage.id) : [];

  // Récupérer le template pour le SEO
  const template = site ? templates.find(t => t.id === site.sourceTemplateId) : null;

  const renderSection = (section: any) => {
    const sectionType = sectionTypes.find((st: any) => st.id === section.sectionTypeId);
    const content = { ...sectionType?.defaultContent, ...section.content, __siteId__: site?.id };
    const styles = { ...sectionType?.defaultStyles, ...section.styles };
    const translations = (section.translations ?? {}) as Record<string, any>;

    return renderRegistrySection(section.sectionTypeId, content, styles, handleNavigate, section.id, translations) ?? (
      <div key={section.id} className="p-8 bg-muted text-center">
        <p className="text-muted-foreground">Section: {section.sectionTypeId}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Site non trouvé
  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Site non trouvé</h1>
          <p className="text-slate-600 mb-6">
            Ce lien de prévisualisation est invalide, a expiré, ou le site n'existe plus.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.href = 'https://app.pixel-rise.com'}
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Site en brouillon (non publié)
  if (site.status === 'draft') {
    return (
      <div className="min-h-screen">
        {/* Bandeau de brouillon */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-slate-800 text-white">
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3">
            <Badge variant="secondary" className="bg-amber-500 text-amber-950 border-0">
              <Eye className="w-3 h-3 mr-1" />
              Brouillon
            </Badge>
            <span className="text-sm">
              Ce site n'est pas encore publié - Prévisualisation privée
            </span>
          </div>
        </div>

        {/* Contenu du site — event delegation for link navigation */}
        <div className="pt-10 min-h-screen flex flex-col" onClick={handlePreviewClick}>
          {/* Global Navbar */}
          {navbar && renderSection({
            id: navbar.id,
            sectionTypeId: navbar.sectionTypeId,
            content: navbar.content,
            styles: navbar.styles,
          })}

          {/* Page Content */}
          <div className="flex-1">
            {sections.length === 0 ? (
              <div className="min-h-[80vh] flex items-center justify-center">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Page vide</h2>
                  <p className="text-muted-foreground">Cette page n'a pas encore de contenu.</p>
                </div>
              </div>
            ) : (
              sections.map(renderSection)
            )}
          </div>

          {/* Global Footer */}
          {footer && renderSection({
            id: footer.id,
            sectionTypeId: footer.sectionTypeId,
            content: footer.content,
            styles: footer.styles,
          })}
        </div>

        {/* Footer de prévisualisation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800/90 backdrop-blur text-white py-2">
          <div className="container mx-auto px-4 text-center text-xs text-slate-400">
            Prévisualisation de "{site.name}" • Créé avec{' '}
            <a href="https://pixel-rise.com" className="text-primary hover:underline">
              Pixel Rise
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Site publié - affichage normal
  return (
    <div className="min-h-screen">
      {/* Navigation entre pages si plusieurs pages */}
      {pages.length > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/90 backdrop-blur rounded-full shadow-lg border px-4 py-2 flex gap-2">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => setCurrentPageSlug(page.slug)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  currentPageSlug === page.slug
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-slate-100'
                }`}
              >
                {page.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenu du site — event delegation for link navigation */}
      <div className="min-h-screen flex flex-col" onClick={handlePreviewClick}>
        {/* Global Navbar */}
        {navbar && renderSection({
          id: navbar.id,
          sectionTypeId: navbar.sectionTypeId,
          content: navbar.content,
          styles: navbar.styles,
        })}

        {/* Page Content */}
        <div className="flex-1">
          {sections.length === 0 ? (
            <div className="min-h-[80vh] flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Page en construction</h2>
                <p className="text-muted-foreground">Le contenu arrive bientôt...</p>
              </div>
            </div>
          ) : (
            sections.map(renderSection)
          )}
        </div>

        {/* Global Footer */}
        {footer && renderSection({
          id: footer.id,
          sectionTypeId: footer.sectionTypeId,
          content: footer.content,
          styles: footer.styles,
        })}
      </div>
    </div>
  );
}
