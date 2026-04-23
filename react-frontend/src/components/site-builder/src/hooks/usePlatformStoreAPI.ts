import { useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import { SiteLang } from '../types/platform';
import { luxiosLangStore } from '../components/editor/sections/luxios/luxiosLangStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import siteBuilderService, {
  Site,
  SitePage,
  SiteSection,
  SiteDomain,
  Template,
  TemplatePage,
  TemplateSection,
  SectionType,
  SeoConfig,
  ProjectInfo,
} from '../services/siteBuilderService';
import { toast } from 'sonner';

// Convertir les noms de champs snake_case vers camelCase pour le frontend
// Avec filtrage des éléments null/undefined pour éviter les erreurs

const transformSection = (section: any): any => {
  if (!section) return null;
  return {
    id: section.id,
    pageId: section.page_id,
    sectionTypeId: section.section_type_id || section.sectionTypeId,
    order: section.order,
    content: section.content || {},
    styles: section.styles || {},
    translations: section.translations || {},
    sectionType: section.section_type || section.sectionType,
  };
};

const transformDomain = (domain: any): any => {
  if (!domain) return null;
  return {
    id: domain.id,
    siteId: domain.site_id,
    domain: domain.domain,
    type: domain.type,
    status: domain.status,
    createdAt: domain.created_at,
  };
};

const transformGlobalSection = (section: any): any => {
  if (!section) return null;
  return {
    id: section.id,
    siteId: section.site_id,
    sectionTypeId: section.section_type_id || section.sectionTypeId,
    position: section.position,
    content: section.content || {},
    styles: section.styles || {},
    sectionType: section.section_type || section.sectionType,
  };
};

const transformPage = (page: any): any => {
  if (!page) return null;
  return {
    id: page.id,
    siteId: page.site_id,
    name: page.name,
    slug: page.slug,
    order: page.order,
    isPublished: page.is_published,
    sections: (page.sections || []).map(transformSection).filter(Boolean),
  };
};

const transformSite = (site: any): any => {
  if (!site) return null;
  return {
    id: site.id,
    userId: site.user_id,
    name: site.name,
    sourceTemplateId: site.source_template_id,
    status: site.status,
    globalStyles: site.global_styles || {},
    seoConfig: site.seo_config,
    previewToken: site.preview_token,
    subdomain: site.subdomain,
    publishedAt: site.published_at,
    createdAt: site.created_at,
    updatedAt: site.updated_at,
    effectivePlanKey: site.effective_plan_key ?? 'draft',
    workspaceId: site.workspace_id ?? site.workspace?.id,
    workspaceName: site.workspace?.name,
    template: site.template,
    pages: (site.pages || []).map(transformPage).filter(Boolean),
    domains: (site.domains || []).map(transformDomain).filter(Boolean),
    globalSections: (site.global_sections || []).map(transformGlobalSection).filter(Boolean),
  };
};

const transformTemplate = (template: any): any => ({
  id: template.id,
  name: template.name,
  description: template.description,
  category: template.category,
  thumbnail: template.thumbnail,
  version: template.version,
  status: template.status,
  price: template.price ?? null,
  priceAriary: template.price_ariary ?? null,
  isPremium: template.is_premium ?? false,
  sitesCount: template.sites_count,
  createdAt: template.created_at,
  updatedAt: template.updated_at,
  pages: template.pages?.map(transformTemplatePage),
});

const transformTemplatePage = (page: any): any => ({
  id: page.id,
  templateId: page.template_id,
  name: page.name,
  slug: page.slug,
  order: page.order,
  sections: page.sections?.map(transformTemplateSection),
});

const transformTemplateSection = (section: any): any => ({
  id: section.id,
  templatePageId: section.template_page_id,
  sectionTypeId: section.section_type_id,
  order: section.order,
  defaultContent: section.default_content,
  defaultStyles: section.default_styles,
  sectionType: section.section_type,
});

const transformSectionType = (type: any): any => ({
  id: type.id,
  name: type.name,
  schema: type.schema,
  defaultContent: type.default_content,
  defaultStyles: type.default_styles,
});

export function usePlatformStoreAPI() {
  const queryClient = useQueryClient();

  // Current user (from auth context - simplified for now)
  const currentUser = {
    id: 'current-user',
    email: 'user@example.com',
    name: 'Utilisateur',
    role: 'user' as const,
    createdAt: new Date().toISOString(),
  };

  // ============ QUERIES ============

  // Section Types
  const { data: sectionTypesRaw = [] } = useQuery({
    queryKey: ['sectionTypes'],
    queryFn: siteBuilderService.getSectionTypes,
    staleTime: 1000 * 60 * 60, // 1 hour (static data)
  });
  const sectionTypes = sectionTypesRaw.map(transformSectionType);

  // Templates
  const { data: templatesRaw = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: siteBuilderService.getTemplates,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  const templates = templatesRaw.map(transformTemplate);

  // Sites
  const { data: sitesRaw = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: siteBuilderService.getSites,
    staleTime: 1000 * 60, // 1 minute
  });
  const sites = sitesRaw.map(transformSite);

  // Derived data (pages, sections, domains from sites)
  const pages = sites.flatMap((site: any) => site.pages || []);
  const sections = pages.flatMap((page: any) => page.sections || []);
  const domains = sites.flatMap((site: any) => site.domains || []);

  // Template pages and sections (from templates)
  const templatePages = templates.flatMap((t: any) => t.pages || []);
  const templateSections = templatePages.flatMap((p: any) => p.sections || []);

  // ============ MUTATIONS ============

  // Create Site (instantiate from template)
  const createSiteMutation = useMutation({
    mutationFn: ({ templateId, projectInfo }: { templateId: string; projectInfo: ProjectInfo }) =>
      siteBuilderService.createSite(templateId, projectInfo),
    onSuccess: (newSite) => {
      // Ajouter immédiatement le nouveau site au cache pour éviter "Site introuvable"
      queryClient.setQueryData(['sites'], (oldData: any[] | undefined) => {
        return oldData ? [...oldData, newSite] : [newSite];
      });
      // Puis invalider pour récupérer les données fraîches
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du site');
    },
  });

  // Update Site
  const updateSiteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      siteBuilderService.updateSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    },
  });

  // Delete Site
  const deleteSiteMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site supprimé');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  // Publish Site
  const publishSiteMutation = useMutation({
    mutationFn: ({ id, subdomain }: { id: string; subdomain: string }) =>
      siteBuilderService.publishSite(id, subdomain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site publié avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la publication');
    },
  });

  // Unpublish Site
  const unpublishSiteMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.unpublishSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Site dépublié');
    },
  });

  // Add Page
  const addPageMutation = useMutation({
    mutationFn: ({ siteId, name, slug }: { siteId: string; name: string; slug: string }) =>
      siteBuilderService.createSitePage(siteId, { name, slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Page créée');
    },
  });

  // Update Page
  const updatePageMutation = useMutation({
    mutationFn: ({ siteId, pageId, data }: { siteId: string; pageId: string; data: any }) =>
      siteBuilderService.updateSitePage(siteId, pageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });

  // Delete Page
  const deletePageMutation = useMutation({
    mutationFn: ({ siteId, pageId }: { siteId: string; pageId: string }) =>
      siteBuilderService.deleteSitePage(siteId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Page supprimée');
    },
  });

  // Duplicate Page
  const duplicatePageMutation = useMutation({
    mutationFn: ({ siteId, pageId }: { siteId: string; pageId: string }) =>
      siteBuilderService.duplicateSitePage(siteId, pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Page dupliquée');
    },
  });

  // Add Section
  const addSectionMutation = useMutation({
    mutationFn: ({ pageId, sectionTypeId, order, styles }: { pageId: string; sectionTypeId: string; order: number; styles?: any }) =>
      siteBuilderService.createSiteSection(pageId, { section_type_id: sectionTypeId, order, styles } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });

  // Update Section - avec mise à jour optimiste du cache (sans refetch)
  const updateSectionMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      siteBuilderService.updateSiteSection(sectionId, data),
    onMutate: async ({ sectionId, data }) => {
      // Annuler les refetch en cours pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ['sites'] });

      // Sauvegarder l'état précédent pour rollback
      const previousSites = queryClient.getQueryData(['sites']);

      // Mise à jour optimiste du cache local
      queryClient.setQueryData(['sites'], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((site: any) => ({
          ...site,
          pages: site.pages?.map((page: any) => ({
            ...page,
            sections: page.sections?.map((section: any) => {
              if (section.id === sectionId) {
                if (data.lang && data.content) {
                  // Mise à jour optimiste des translations
                  const existingTranslations = section.translations || {};
                  return {
                    ...section,
                    translations: {
                      ...existingTranslations,
                      [data.lang]: { ...(existingTranslations[data.lang] || {}), ...data.content },
                    },
                  };
                }
                return {
                  ...section,
                  content: data.content ? { ...section.content, ...data.content } : section.content,
                  styles: data.styles ? { ...section.styles, ...data.styles } : section.styles,
                };
              }
              return section;
            }),
          })),
        }));
      });

      return { previousSites };
    },
    onError: (_err, _variables, context) => {
      // Restaurer l'état précédent en cas d'erreur
      if (context?.previousSites) {
        queryClient.setQueryData(['sites'], context.previousSites);
      }
      toast.error('Erreur lors de la mise à jour');
    },
    // Pas de onSuccess avec invalidateQueries pour éviter le refetch qui écrase les modifications
  });

  // Delete Section
  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => siteBuilderService.deleteSiteSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });

  // Reorder Sections
  const reorderSectionsMutation = useMutation({
    mutationFn: ({ pageId, sectionIds }: { pageId: string; sectionIds: string[] }) =>
      siteBuilderService.reorderSiteSections(pageId, sectionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });

  // Add Domain
  const addDomainMutation = useMutation({
    mutationFn: ({ siteId, domain }: { siteId: string; domain: string }) =>
      siteBuilderService.addSiteDomain(siteId, domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Domaine ajouté (en attente de vérification)');
    },
  });

  // Update Global Section (navbar/footer) - avec mise à jour optimiste
  const updateGlobalSectionMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) =>
      siteBuilderService.updateGlobalSection(sectionId, data),
    onMutate: async ({ sectionId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['sites'] });
      const previousSites = queryClient.getQueryData(['sites']);

      queryClient.setQueryData(['sites'], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((site: any) => ({
          ...site,
          global_sections: site.global_sections?.map((section: any) => {
            if (section.id === sectionId) {
              return {
                ...section,
                content: data.content ? { ...section.content, ...data.content } : section.content,
                styles: data.styles ? { ...section.styles, ...data.styles } : section.styles,
              };
            }
            return section;
          }),
        }));
      });

      return { previousSites };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSites) {
        queryClient.setQueryData(['sites'], context.previousSites);
      }
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Replace Global Section type (navbar/footer) - calls store endpoint which deletes+creates
  const replaceGlobalSectionMutation = useMutation({
    mutationFn: ({ siteId, position, sectionTypeId }: { siteId: string; position: 'navbar' | 'footer'; sectionTypeId: string }) =>
      siteBuilderService.createGlobalSection(siteId, { position, section_type_id: sectionTypeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast.success('Section globale mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors du changement de section');
    },
  });

  // ============ LANGUE ACTIVE (traductions) ============

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

  const [activeLang, _setActiveLang] = useState<string>('');
  const setActiveLang = useCallback((lang: string) => {
    _setActiveLang(lang);
    luxiosLangStore.set(lang);
  }, []);
  const [siteLangs, setSiteLangs] = useState<SiteLang[]>([]);

  const loadSiteLangs = useCallback(async (siteId: string) => {
    try {
      const res = await api.get(`/site-builder/sites/${siteId}/languages`);
      const langs: SiteLang[] = (res.data.data ?? []).map((l: any) => ({
        code: l.language_code,
        name: LANG_NAMES[l.language_code]?.name ?? l.language_code.toUpperCase(),
        flag: LANG_NAMES[l.language_code]?.flag ?? '🌐',
        isDefault: l.is_default,
      }));
      setSiteLangs(langs);
      luxiosLangStore.setSiteId(siteId);
      luxiosLangStore.setLangs(langs);

      // Restaurer la langue depuis localStorage, sinon utiliser la langue par défaut
      const persisted = luxiosLangStore.getPersistedLang(siteId);
      const validPersisted = persisted && langs.find(l => l.code === persisted);
      const target = validPersisted
        ? persisted
        : (langs.find(l => l.isDefault)?.code ?? '');
      if (target) setActiveLang(target);
    } catch {
      // silencieux
    }
  }, []);

  /**
   * Traduit tout le site via OpenAI et recharge les sections depuis l'API.
   * Retourne { success, message }.
   */
  const translateSite = useCallback(async (
    siteId: string,
    targetLang: string,
    targetName: string,
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.post(`/site-builder/sites/${siteId}/translate`, {
        target_lang: targetLang,
        target_name: targetName,
      });
      if (res.data.success) {
        // Recharger les sites pour avoir les nouvelles traductions en mémoire
        queryClient.invalidateQueries({ queryKey: ['sites'] });
      }
      return { success: res.data.success, message: res.data.message ?? '' };
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erreur lors de la traduction.';
      return { success: false, message: msg };
    }
  }, [queryClient]);

  const getSiteIdByPageId = useCallback((pageId: string): string | null => {
    for (const site of sites) {
      for (const page of (site as any).pages ?? []) {
        if (page.id === pageId) return site.id;
      }
    }
    return null;
  }, [sites]);

  const updateSectionTranslation = useCallback((sectionId: string, lang: string, content: Record<string, unknown>) => {
    updateSectionMutation.mutate({ sectionId, data: { content, lang } });
  }, [updateSectionMutation]);

  // ============ HELPER FUNCTIONS ============

  const instantiateSite = useCallback(async (templateId: string, projectInfo: ProjectInfo) => {
    const rawSite = await createSiteMutation.mutateAsync({ templateId, projectInfo });
    return transformSite(rawSite);
  }, [createSiteMutation]);

  const updateSectionContent = useCallback((sectionId: string, content: Record<string, unknown>) => {
    updateSectionMutation.mutate({ sectionId, data: { content } });
  }, [updateSectionMutation]);

  const updateSectionStyles = useCallback((sectionId: string, styles: Record<string, unknown>) => {
    updateSectionMutation.mutate({ sectionId, data: { styles } });
  }, [updateSectionMutation]);

  const addSection = useCallback((pageId: string, sectionTypeId: string, order: number, variantStyles?: Record<string, any>) => {
    return addSectionMutation.mutateAsync({ pageId, sectionTypeId, order, styles: variantStyles });
  }, [addSectionMutation]);

  const removeSection = useCallback((sectionId: string) => {
    deleteSectionMutation.mutate(sectionId);
  }, [deleteSectionMutation]);

  const reorderSections = useCallback((pageId: string, sectionIds: string[]) => {
    reorderSectionsMutation.mutate({ pageId, sectionIds });
  }, [reorderSectionsMutation]);

  const publishSite = useCallback((siteId: string, subdomain: string) => {
    publishSiteMutation.mutate({ id: siteId, subdomain });
  }, [publishSiteMutation]);

  const unpublishSite = useCallback((siteId: string) => {
    unpublishSiteMutation.mutate(siteId);
  }, [unpublishSiteMutation]);

  const deleteSite = useCallback((siteId: string) => {
    deleteSiteMutation.mutate(siteId);
  }, [deleteSiteMutation]);

  const addCustomDomain = useCallback((siteId: string, domainName: string) => {
    return addDomainMutation.mutateAsync({ siteId, domain: domainName });
  }, [addDomainMutation]);

  const getSitePages = useCallback((siteId: string) => {
    const site = sites.find((s: any) => s.id === siteId);
    return (site?.pages || []).sort((a: any, b: any) => a.order - b.order);
  }, [sites]);

  const getPageSections = useCallback((pageId: string) => {
    const page = pages.find((p: any) => p.id === pageId);
    // Filter out invalid sections (undefined, null, or missing required fields)
    return (page?.sections || [])
      .filter((s: any) => s && s.id && s.sectionTypeId)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
  }, [pages]);

  const getSiteDomains = useCallback((siteId: string) => {
    const site = sites.find((s: any) => s.id === siteId);
    return (site?.domains || []).filter((d: any) => d && d.id);
  }, [sites]);

  const getSiteGlobalSections = useCallback((siteId: string) => {
    const site = sites.find((s: any) => s.id === siteId);
    // Filter out invalid global sections
    return (site?.globalSections || []).filter((s: any) => s && s.id && s.sectionTypeId && s.position);
  }, [sites]);

  const getSiteNavbar = useCallback((siteId: string) => {
    const globalSections = getSiteGlobalSections(siteId);
    const navbar = globalSections.find((s: any) => s.position === 'navbar');
    // Return null if navbar doesn't have required fields
    return navbar && navbar.sectionTypeId ? navbar : null;
  }, [getSiteGlobalSections]);

  const getSiteFooter = useCallback((siteId: string) => {
    const globalSections = getSiteGlobalSections(siteId);
    const footer = globalSections.find((s: any) => s.position === 'footer');
    // Return null if footer doesn't have required fields
    return footer && footer.sectionTypeId ? footer : null;
  }, [getSiteGlobalSections]);

  const updateGlobalSectionContent = useCallback((sectionId: string, content: Record<string, unknown>) => {
    updateGlobalSectionMutation.mutate({ sectionId, data: { content } });
  }, [updateGlobalSectionMutation]);

  const updateGlobalSectionStyles = useCallback((sectionId: string, styles: Record<string, unknown>) => {
    updateGlobalSectionMutation.mutate({ sectionId, data: { styles } });
  }, [updateGlobalSectionMutation]);

  const replaceGlobalSection = useCallback((siteId: string, position: 'navbar' | 'footer', sectionTypeId: string) => {
    return replaceGlobalSectionMutation.mutateAsync({ siteId, position, sectionTypeId });
  }, [replaceGlobalSectionMutation]);

  const addPage = useCallback((siteId: string, pageName: string, slug: string) => {
    return addPageMutation.mutateAsync({ siteId, name: pageName, slug });
  }, [addPageMutation]);

  const deletePage = useCallback((pageId: string) => {
    const page = pages.find((p: any) => p.id === pageId);
    if (page) {
      deletePageMutation.mutate({ siteId: page.siteId, pageId });
    }
  }, [pages, deletePageMutation]);

  const updatePage = useCallback((pageId: string, updates: any) => {
    const page = pages.find((p: any) => p.id === pageId);
    if (page) {
      updatePageMutation.mutate({ siteId: page.siteId, pageId, data: updates });
    }
  }, [pages, updatePageMutation]);

  const duplicatePage = useCallback((pageId: string) => {
    const page = pages.find((p: any) => p.id === pageId);
    if (page) {
      return duplicatePageMutation.mutateAsync({ siteId: page.siteId, pageId });
    }
    return null;
  }, [pages, duplicatePageMutation]);

  const updateSiteStyles = useCallback((siteId: string, globalStyles: Record<string, unknown>) => {
    updateSiteMutation.mutate({ id: siteId, data: { global_styles: globalStyles } });
  }, [updateSiteMutation]);

  const updateSiteSeo = useCallback((siteId: string, seoConfig: SeoConfig) => {
    updateSiteMutation.mutate({ id: siteId, data: { seo_config: seoConfig } });
  }, [updateSiteMutation]);

  // ============ ADMIN TEMPLATE MUTATIONS ============

  const createTemplateMutation = useMutation({
    mutationFn: (data: any) => siteBuilderService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => siteBuilderService.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.duplicateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.archiveTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const createTemplatePageMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      siteBuilderService.createTemplatePage(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const updateTemplatePageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      siteBuilderService.updateTemplatePage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const deleteTemplatePageMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.deleteTemplatePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const createTemplateSectionMutation = useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: any }) =>
      siteBuilderService.createTemplateSection(pageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const updateTemplateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      siteBuilderService.updateTemplateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const deleteTemplateSectionMutation = useMutation({
    mutationFn: (id: string) => siteBuilderService.deleteTemplateSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Admin template action wrappers
  const addTemplate = useCallback(async (data: any) => {
    try {
      const result = await createTemplateMutation.mutateAsync(data);
      return transformTemplate(result);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création du template');
      return null;
    }
  }, [createTemplateMutation]);

  const updateTemplate = useCallback(async (id: string, updates: any) => {
    try {
      // Convert camelCase to snake_case for backend
      const backendData: any = {};
      if (updates.name !== undefined) backendData.name = updates.name;
      if (updates.description !== undefined) backendData.description = updates.description;
      if (updates.category !== undefined) backendData.category = updates.category;
      if (updates.thumbnail !== undefined) backendData.thumbnail = updates.thumbnail;
      if (updates.version !== undefined) backendData.version = updates.version;
      if (updates.status !== undefined) backendData.status = updates.status;
      if (updates.isPremium !== undefined) backendData.is_premium = updates.isPremium;
      if (updates.price !== undefined) backendData.price = updates.price;
      if (updates.priceAriary !== undefined) backendData.price_ariary = updates.priceAriary;
      await updateTemplateMutation.mutateAsync({ id, data: backendData });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du template');
    }
  }, [updateTemplateMutation]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await deleteTemplateMutation.mutateAsync(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  }, [deleteTemplateMutation]);

  const duplicateTemplate = useCallback(async (id: string) => {
    try {
      const result = await duplicateTemplateMutation.mutateAsync(id);
      return transformTemplate(result);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la duplication');
      return null;
    }
  }, [duplicateTemplateMutation]);

  const archiveTemplate = useCallback(async (id: string) => {
    try {
      await archiveTemplateMutation.mutateAsync(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'archivage');
    }
  }, [archiveTemplateMutation]);

  const addTemplatePage = useCallback(async (templateId: string, data: any) => {
    try {
      const result = await createTemplatePageMutation.mutateAsync({ templateId, data });
      return transformTemplatePage(result);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'ajout de la page');
      return null;
    }
  }, [createTemplatePageMutation]);

  const updateTemplatePage = useCallback(async (id: string, updates: any) => {
    try {
      await updateTemplatePageMutation.mutateAsync({ id, data: updates });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour de la page');
    }
  }, [updateTemplatePageMutation]);

  const deleteTemplatePage = useCallback(async (id: string) => {
    try {
      await deleteTemplatePageMutation.mutateAsync(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression de la page');
    }
  }, [deleteTemplatePageMutation]);

  const addTemplateSection = useCallback(async (templatePageId: string, sectionTypeId: string, order: number) => {
    try {
      const result = await createTemplateSectionMutation.mutateAsync({
        pageId: templatePageId,
        data: { section_type_id: sectionTypeId, order }
      });
      return transformTemplateSection(result);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'ajout de la section');
      return null;
    }
  }, [createTemplateSectionMutation]);

  const updateTemplateSection = useCallback(async (id: string, updates: any) => {
    try {
      await updateTemplateSectionMutation.mutateAsync({ id, data: updates });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour de la section');
    }
  }, [updateTemplateSectionMutation]);

  const deleteTemplateSection = useCallback(async (id: string) => {
    try {
      await deleteTemplateSectionMutation.mutateAsync(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression de la section');
    }
  }, [deleteTemplateSectionMutation]);

  const updateUserRole = useCallback((userId: string, role: 'admin' | 'user') => {
    console.log('updateUserRole not implemented', userId, role);
  }, []);

  const clearAllData = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Mock users for now
  const users = [currentUser];

  return {
    // Data
    sites,
    pages,
    sections,
    domains,
    templates,
    templatePages,
    templateSections,
    sectionTypes,
    currentUser,
    users,

    // Loading states
    isLoading: sitesLoading,

    // Site actions
    instantiateSite,
    updateSectionContent,
    updateSectionStyles,
    addSection,
    removeSection,
    reorderSections,
    publishSite,
    unpublishSite,
    deleteSite,
    addCustomDomain,
    updateSiteStyles,
    updateSiteSeo,

    // Page actions
    addPage,
    deletePage,
    updatePage,
    duplicatePage,

    // Getters
    getSitePages,
    getPageSections,
    getSiteDomains,
    getSiteGlobalSections,
    getSiteNavbar,
    getSiteFooter,

    // Global Section actions
    updateGlobalSectionContent,
    updateGlobalSectionStyles,
    replaceGlobalSection,

    // Admin template actions (placeholders)
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    archiveTemplate,
    addTemplatePage,
    updateTemplatePage,
    deleteTemplatePage,
    addTemplateSection,
    updateTemplateSection,
    deleteTemplateSection,
    updateUserRole,
    clearAllData,

    // Traductions / langues
    activeLang,
    setActiveLang,
    siteLangs,
    loadSiteLangs,
    translateSite,
    getSiteIdByPageId,
    updateSectionTranslation,
  };
}
