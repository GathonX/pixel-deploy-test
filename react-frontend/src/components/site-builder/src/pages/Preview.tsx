import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlatform } from '../contexts/PlatformContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Eye, X, ExternalLink, Edit } from 'lucide-react';
import { renderSection as renderRegistrySection } from '../components/editor/sections/sectionRegistry';
import { luxiosLangStore } from '../components/editor/sections/luxios/luxiosLangStore';
import SitePublicBlogList from '../components/public/SitePublicBlogList';
import SitePublicBlogDetail from '../components/public/SitePublicBlogDetail';

function parseBlogRoute(pathname: string): { type: 'list' } | { type: 'detail'; slug: string } | null {
  const clean = pathname.replace(/\/$/, '');
  if (clean === '/blog') return { type: 'list' };
  const match = clean.match(/^\/blog\/([^/]+)$/);
  if (match) return { type: 'detail', slug: match[1] };
  return null;
}

function PreviewBanner({ site, pages, currentPageSlug, onPageChange, navigate }: {
  site: any; pages: any[]; currentPageSlug: string; onPageChange: (s: string) => void; navigate: (p: string) => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-amber-600 text-white border-0">
            <Eye className="w-3 h-3 mr-1" />
            Prévisualisation
          </Badge>
          <span className="font-medium text-sm hidden sm:inline">{site.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {pages.length > 1 && (
            <Select value={currentPageSlug} onValueChange={onPageChange}>
              <SelectTrigger className="h-8 w-32 bg-amber-400 border-amber-600 text-amber-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page: any) => (
                  <SelectItem key={page.id} value={page.slug}>{page.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="secondary" size="sm" className="bg-amber-400 hover:bg-amber-300 text-amber-950 border-0"
            onClick={() => navigate(`/site-builder/editor/${site.id}`)}>
            <Edit className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Éditer</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-950 hover:bg-amber-400"
            onClick={() => navigate('/site-builder')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Preview() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { sites, isLoading, getSitePages, getPageSections, getSiteNavbar, getSiteFooter, sectionTypes, loadSiteLangs } = usePlatform() as any;
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
  const [blogRoute, setBlogRoute] = useState<{ type: 'list' } | { type: 'detail'; slug: string } | null>(null);

  const currentPage = useMemo(() => {
    return pages.find(p => p.slug === currentPageSlug) || pages[0];
  }, [pages, currentPageSlug]);

  // Navigate helper for all slug-based navigation
  const handleNavigateSlug = (slug: string) => {
    const normalized = slug.replace(/^[/#]+/, '').split('?')[0].split('#')[0];
    const newSlug = normalized === '' ? '/' : `/${normalized}`;

    const blog = parseBlogRoute(newSlug);
    if (blog) {
      setBlogRoute(blog);
      window.scrollTo(0, 0);
      return;
    }

    setBlogRoute(null);
    setCurrentPageSlug(newSlug);
    window.scrollTo(0, 0);
  };

  const handleReadMore = (postSlug: string) => {
    handleNavigateSlug(`/blog/${postSlug}`);
  };

  // Event delegation: intercept all <a> clicks for page navigation
  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('http')) {
        e.preventDefault();
        handleNavigateSlug(href);
      }
    }
  };

  const sections = currentPage ? getPageSections(currentPage.id) : [];

  const renderSection = (section: any) => {
    const sectionType = sectionTypes.find((st: any) => st.id === section.sectionTypeId);
    const content = { ...sectionType?.defaultContent, ...section.content, __siteId__: site?.id };
    const styles = { ...sectionType?.defaultStyles, ...section.styles };
    const translations = (section.translations ?? {}) as Record<string, any>;

    return renderRegistrySection(section.sectionTypeId, content, styles, handleNavigateSlug, section.id, translations) ?? (
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

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Prévisualisation non trouvée</h1>
          <p className="text-muted-foreground mb-4">Ce lien de prévisualisation est invalide ou a expiré.</p>
          <Button onClick={() => navigate('/site-builder')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  // Pages blog publiques dans le preview
  if (site && blogRoute) {
    if (blogRoute.type === 'list') {
      return (
        <>
          <PreviewBanner site={site} pages={pages} currentPageSlug={currentPageSlug} onPageChange={setCurrentPageSlug} navigate={navigate} />
          <div className="pt-10">
            <SitePublicBlogList
              siteId={site.id}
              onNavigate={handleNavigateSlug}
              onReadMore={handleReadMore}
            />
          </div>
        </>
      );
    }
    if (blogRoute.type === 'detail') {
      return (
        <>
          <PreviewBanner site={site} pages={pages} currentPageSlug={currentPageSlug} onPageChange={setCurrentPageSlug} navigate={navigate} />
          <div className="pt-10">
            <SitePublicBlogDetail
              siteId={site.id}
              postSlug={blogRoute.slug}
              onBack={() => handleNavigateSlug('/blog')}
              onNavigate={handleNavigateSlug}
            />
          </div>
        </>
      );
    }
  }

  return (
    <div className="min-h-screen">
      {/* Preview Banner */}
      <PreviewBanner site={site} pages={pages} currentPageSlug={currentPageSlug} onPageChange={setCurrentPageSlug} navigate={navigate} />

      {/* Site Content — event delegation catches all <a> clicks for page navigation */}
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
                <p className="text-muted-foreground mb-4">Cette page est vide</p>
                <Button onClick={() => navigate(`/site-builder/editor/${site.id}`)}>
                  Ajouter du contenu
                </Button>
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
