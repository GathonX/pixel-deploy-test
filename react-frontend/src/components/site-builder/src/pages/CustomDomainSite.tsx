import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { renderSection as registryRenderSection } from '../components/editor/sections/sectionRegistry';
import { luxiosLangStore } from '../components/editor/sections/luxios/luxiosLangStore';
import SitePublicBlogList from '../components/public/SitePublicBlogList';
import SitePublicBlogDetail from '../components/public/SitePublicBlogDetail';

// Analyse le pathname pour détecter les routes blog publiques
function parseBlogRoute(pathname: string): { type: 'list' } | { type: 'detail'; slug: string } | null {
  const clean = pathname.replace(/\/$/, '');
  if (clean === '/blog') return { type: 'list' };
  const match = clean.match(/^\/blog\/([^/]+)$/);
  if (match) return { type: 'detail', slug: match[1] };
  return null;
}

// LANG_NAMES mirrors usePlatformStoreAPI — kept in sync manually
const LANG_NAMES: Record<string, { name: string; flag: string }> = {
  // Europe
  fr: { name: 'Français',    flag: '🇫🇷' },
  en: { name: 'English',     flag: '🇬🇧' },
  de: { name: 'Deutsch',     flag: '🇩🇪' },
  es: { name: 'Español',     flag: '🇪🇸' },
  it: { name: 'Italiano',    flag: '🇮🇹' },
  pt: { name: 'Português',   flag: '🇵🇹' },
  nl: { name: 'Nederlands',  flag: '🇳🇱' },
  pl: { name: 'Polski',      flag: '🇵🇱' },
  ru: { name: 'Русский',     flag: '🇷🇺' },
  uk: { name: 'Українська',  flag: '🇺🇦' },
  sv: { name: 'Svenska',     flag: '🇸🇪' },
  nb: { name: 'Norsk',       flag: '🇳🇴' },
  da: { name: 'Dansk',       flag: '🇩🇰' },
  fi: { name: 'Suomi',       flag: '🇫🇮' },
  cs: { name: 'Čeština',     flag: '🇨🇿' },
  sk: { name: 'Slovenčina',  flag: '🇸🇰' },
  hu: { name: 'Magyar',      flag: '🇭🇺' },
  ro: { name: 'Română',      flag: '🇷🇴' },
  bg: { name: 'Български',   flag: '🇧🇬' },
  hr: { name: 'Hrvatski',    flag: '🇭🇷' },
  sr: { name: 'Srpski',      flag: '🇷🇸' },
  el: { name: 'Ελληνικά',    flag: '🇬🇷' },
  tr: { name: 'Türkçe',      flag: '🇹🇷' },
  ca: { name: 'Català',      flag: '🏴' },
  // Afrique
  mg: { name: 'Malagasy',    flag: '🇲🇬' },
  sw: { name: 'Kiswahili',   flag: '🇰🇪' },
  ha: { name: 'Hausa',       flag: '🇳🇬' },
  yo: { name: 'Yorùbá',      flag: '🇳🇬' },
  ig: { name: 'Igbo',        flag: '🇳🇬' },
  am: { name: 'አማርኛ',        flag: '🇪🇹' },
  so: { name: 'Soomaali',    flag: '🇸🇴' },
  rw: { name: 'Kinyarwanda', flag: '🇷🇼' },
  sn: { name: 'ChiShona',    flag: '🇿🇼' },
  zu: { name: 'isiZulu',     flag: '🇿🇦' },
  af: { name: 'Afrikaans',   flag: '🇿🇦' },
  // Moyen-Orient & Asie centrale
  ar: { name: 'العربية',     flag: '🇸🇦' },
  fa: { name: 'فارسی',       flag: '🇮🇷' },
  he: { name: 'עברית',       flag: '🇮🇱' },
  ur: { name: 'اردو',        flag: '🇵🇰' },
  // Asie
  zh: { name: '中文',         flag: '🇨🇳' },
  ja: { name: '日本語',       flag: '🇯🇵' },
  ko: { name: '한국어',       flag: '🇰🇷' },
  hi: { name: 'हिन्दी',       flag: '🇮🇳' },
  bn: { name: 'বাংলা',       flag: '🇧🇩' },
  ta: { name: 'தமிழ்',       flag: '🇮🇳' },
  te: { name: 'తెలుగు',       flag: '🇮🇳' },
  th: { name: 'ภาษาไทย',     flag: '🇹🇭' },
  vi: { name: 'Tiếng Việt',  flag: '🇻🇳' },
  id: { name: 'Bahasa Indonesia', flag: '🇮🇩' },
  ms: { name: 'Bahasa Melayu',   flag: '🇲🇾' },
  tl: { name: 'Filipino',    flag: '🇵🇭' },
  // Amériques
  'pt-BR': { name: 'Português (Brasil)', flag: '🇧🇷' },
  'es-MX': { name: 'Español (México)',   flag: '🇲🇽' },
  ht: { name: 'Kreyòl Ayisyen', flag: '🇭🇹' },
  qu: { name: 'Quechua',     flag: '🇵🇪' },
};

interface SiteSection {
  id: string;
  sectionTypeId: string;
  order: number;
  content: Record<string, any>;
  styles: Record<string, any>;
  translations?: Record<string, any>;
}

interface SitePage {
  id: string;
  name: string;
  slug: string;
  order: number;
  sections: SiteSection[];
}

interface GlobalSection {
  id: string;
  position: 'navbar' | 'footer';
  sectionTypeId: string;
  content: Record<string, any>;
  styles: Record<string, any>;
  translations?: Record<string, any>;
}

interface SiteData {
  id: string;
  name: string;
  globalStyles: Record<string, any>;
  seoConfig?: Record<string, any>;
  languages?: { code: string; is_default: boolean }[];
  globalSections: GlobalSection[];
  pages: SitePage[];
}

export default function CustomDomainSite() {
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const initialPathname = window.location.pathname || '/';
  const initialBlog = parseBlogRoute(initialPathname);
  const initialSlug = initialBlog ? '/' : (initialPathname === '' ? '/' : initialPathname);

  const [currentPageSlug, setCurrentPageSlug] = useState(initialSlug);
  const [blogRoute, setBlogRoute] = useState<{ type: 'list' } | { type: 'detail'; slug: string } | null>(initialBlog);

  useEffect(() => {
    const domain = window.location.hostname;
    axios.get(`/api/site-builder/preview/domain/${domain}`)
      .then(res => {
        const data: SiteData = res.data.data;
        setSite(data);

        // Initialiser le store de langues pour les composants Luxios
        if (data.id && data.languages && data.languages.length > 0) {
          const langs = data.languages.map(l => ({
            code:      l.code,
            name:      LANG_NAMES[l.code]?.name ?? l.code.toUpperCase(),
            flag:      LANG_NAMES[l.code]?.flag ?? '🌐',
            isDefault: l.is_default,
          }));
          luxiosLangStore.setSiteId(data.id);
          luxiosLangStore.setLangs(langs);

          // Restaurer la langue depuis localStorage, sinon utiliser la langue par défaut
          const persisted = luxiosLangStore.getPersistedLang(data.id);
          const validPersisted = persisted && langs.find(l => l.code === persisted);
          const target = validPersisted
            ? persisted
            : (langs.find(l => l.isDefault)?.code ?? langs[0]?.code ?? '');
          if (target) luxiosLangStore.set(target);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  // Update document title from SEO config
  useEffect(() => {
    if (site?.seoConfig?.siteTitle) {
      document.title = site.seoConfig.siteTitle;
    } else if (site?.name) {
      document.title = site.name;
    }
  }, [site]);

  const pages = useMemo(() => {
    return (site?.pages || []).sort((a, b) => a.order - b.order);
  }, [site]);

  const currentPage = useMemo(() => {
    return pages.find(p => p.slug === currentPageSlug) || pages[0];
  }, [pages, currentPageSlug]);

  const sections = currentPage?.sections?.sort((a, b) => a.order - b.order) || [];

  const navbar = site?.globalSections?.find(gs => gs.position === 'navbar');
  const footer = site?.globalSections?.find(gs => gs.position === 'footer');

  const handleNavigate = (slug: string) => {
    const normalized = slug.replace(/^[/#]+/, '').split('?')[0].split('#')[0];
    const newSlug = normalized === '' ? '/' : `/${normalized}`;

    // Vérifier si c'est une route blog
    const blog = parseBlogRoute(newSlug);
    if (blog) {
      setBlogRoute(blog);
      window.history.pushState({}, '', newSlug);
      window.scrollTo(0, 0);
      return;
    }

    // Route site normale
    setBlogRoute(null);
    setCurrentPageSlug(newSlug);
    window.history.pushState({}, '', newSlug);
    window.scrollTo(0, 0);
  };

  const handleReadMore = (postSlug: string) => {
    handleNavigate(`/blog/${postSlug}`);
  };

  const handleClick = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('http')) {
        e.preventDefault();
        handleNavigate(href);
      }
    }
  };

  const renderSection = (section: SiteSection) => {
    // Injecter __siteId__ pour que NewsLuxios et ContactLuxios puissent appeler les APIs publiques
    const content = { ...section.content, __siteId__: site!.id };
    const translations = section.translations ?? {};
    const rendered = registryRenderSection(
      section.sectionTypeId,
      content,
      section.styles,
      handleNavigate,
      section.id,
      translations,
    );
    return rendered ?? null;
  };

  const renderGlobal = (gs: GlobalSection) =>
    renderSection({
      id: gs.id,
      sectionTypeId: gs.sectionTypeId,
      order: -1,
      content: gs.content,
      styles: gs.styles,
      translations: gs.translations,
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Pages blog publiques (rendu sans le site wrapper)
  if (!loading && site && blogRoute) {
    if (blogRoute.type === 'list') {
      return (
        <SitePublicBlogList
          siteId={site.id}
          onNavigate={handleNavigate}
          onReadMore={handleReadMore}
        />
      );
    }
    if (blogRoute.type === 'detail') {
      return (
        <SitePublicBlogDetail
          siteId={site.id}
          postSlug={blogRoute.slug}
          onBack={() => handleNavigate('/blog')}
          onNavigate={handleNavigate}
        />
      );
    }
  }

  if (notFound || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Site introuvable</h1>
          <p className="text-gray-500">Ce domaine n'est lié à aucun site publié.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" onClick={handleClick}>
      {/* Multi-page nav pill — masqué si le template a son propre navbar */}
      {pages.length > 1 && !sections.some(s => s.sectionTypeId.includes('navbar')) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white/90 backdrop-blur rounded-full shadow-lg border px-4 py-2 flex gap-2">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={(e) => { e.stopPropagation(); handleNavigate(page.slug); }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  currentPageSlug === page.slug
                    ? 'bg-gray-900 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {page.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col">
        {navbar && renderGlobal(navbar)}
        <div className="flex-1">
          {sections.map(s => renderSection(s))}
        </div>
        {footer && renderGlobal(footer)}
      </div>
    </div>
  );
}
