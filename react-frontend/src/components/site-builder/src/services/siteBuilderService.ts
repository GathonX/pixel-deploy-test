import axios from 'axios';
import { getActiveWorkspaceId } from '@/services/api';

const API_BASE = '/api/site-builder';

// Types
export interface SectionType {
  id: string;
  name: string;
  schema: Record<string, unknown>;
  default_content: Record<string, unknown>;
  default_styles: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  price: number | null;
  price_ariary: number | null;
  is_premium: boolean;
  sites_count?: number;
  created_at: string;
  updated_at: string;
  pages?: TemplatePage[];
}

export interface TemplatePage {
  id: string;
  template_id: string;
  name: string;
  slug: string;
  order: number;
  sections?: TemplateSection[];
}

export interface TemplateSection {
  id: string;
  template_page_id: string;
  section_type_id: string;
  order: number;
  default_content: Record<string, unknown>;
  default_styles: Record<string, unknown>;
  section_type?: SectionType;
}

export interface Site {
  id: string;
  user_id: number;
  name: string;
  source_template_id: string;
  status: 'draft' | 'published';
  global_styles: Record<string, unknown>;
  seo_config?: SeoConfig;
  preview_token: string;
  subdomain?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  template?: Template;
  pages?: SitePage[];
  domains?: SiteDomain[];
  global_sections?: SiteGlobalSection[];
}

export interface SitePage {
  id: string;
  site_id: string;
  name: string;
  slug: string;
  order: number;
  is_published: boolean;
  sections?: SiteSection[];
}

export interface SiteSection {
  id: string;
  page_id: string;
  section_type_id: string;
  order: number;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
  section_type?: SectionType;
}

export interface SiteGlobalSection {
  id: string;
  site_id: string;
  section_type_id: string;
  position: 'navbar' | 'footer';
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
  section_type?: SectionType;
}

export interface SiteDomain {
  id: string;
  site_id: string;
  domain: string;
  type: 'subdomain' | 'custom';
  status: 'pending' | 'verified' | 'error';
  created_at: string;
}

export interface SeoConfig {
  siteTitle?: string;
  siteDescription?: string;
  siteKeywords?: string[];
  favicon?: string;
  ogImage?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  canonicalUrl?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
  twitterHandle?: string;
  customHeadCode?: string;
  customBodyCode?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============ SECTION TYPES ============

export async function getSectionTypes(): Promise<SectionType[]> {
  const response = await axios.get<ApiResponse<SectionType[]>>(`${API_BASE}/section-types`);
  return response.data.data;
}

export async function getSectionType(id: string): Promise<SectionType> {
  const response = await axios.get<ApiResponse<SectionType>>(`${API_BASE}/section-types/${id}`);
  return response.data.data;
}

// ============ TEMPLATES ============

export async function getTemplates(): Promise<Template[]> {
  const response = await axios.get<ApiResponse<Template[]>>(`${API_BASE}/templates`);
  return response.data.data;
}

export async function getTemplate(id: string): Promise<Template> {
  const response = await axios.get<ApiResponse<Template>>(`${API_BASE}/templates/${id}`);
  return response.data.data;
}

// Admin
export async function getAdminTemplates(): Promise<Template[]> {
  const response = await axios.get<ApiResponse<Template[]>>(`${API_BASE}/admin/templates`);
  return response.data.data;
}

export async function createTemplate(data: Partial<Template>): Promise<Template> {
  const response = await axios.post<ApiResponse<Template>>(`${API_BASE}/admin/templates`, data);
  return response.data.data;
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
  const response = await axios.put<ApiResponse<Template>>(`${API_BASE}/admin/templates/${id}`, data);
  return response.data.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/admin/templates/${id}`);
}

export async function duplicateTemplate(id: string): Promise<Template> {
  const response = await axios.post<ApiResponse<Template>>(`${API_BASE}/admin/templates/${id}/duplicate`);
  return response.data.data;
}

export async function archiveTemplate(id: string): Promise<Template> {
  const response = await axios.post<ApiResponse<Template>>(`${API_BASE}/admin/templates/${id}/archive`);
  return response.data.data;
}

// ============ TEMPLATE IMAGE UPLOAD ============

export async function uploadTemplateImage(file: File): Promise<{ path: string; filename: string }> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await axios.post<ApiResponse<{ path: string; filename: string }>>(`${API_BASE}/admin/upload-template-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}

// ============ TEMPLATE PAGES ============

export async function getTemplatePages(templateId: string): Promise<TemplatePage[]> {
  const response = await axios.get<ApiResponse<TemplatePage[]>>(`${API_BASE}/admin/templates/${templateId}/pages`);
  return response.data.data;
}

export async function createTemplatePage(templateId: string, data: Partial<TemplatePage>): Promise<TemplatePage> {
  const response = await axios.post<ApiResponse<TemplatePage>>(`${API_BASE}/admin/templates/${templateId}/pages`, data);
  return response.data.data;
}

export async function updateTemplatePage(id: string, data: Partial<TemplatePage>): Promise<TemplatePage> {
  const response = await axios.put<ApiResponse<TemplatePage>>(`${API_BASE}/admin/template-pages/${id}`, data);
  return response.data.data;
}

export async function deleteTemplatePage(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/admin/template-pages/${id}`);
}

// ============ TEMPLATE SECTIONS ============

export async function getTemplateSections(pageId: string): Promise<TemplateSection[]> {
  const response = await axios.get<ApiResponse<TemplateSection[]>>(`${API_BASE}/admin/template-pages/${pageId}/sections`);
  return response.data.data;
}

export async function createTemplateSection(pageId: string, data: Partial<TemplateSection>): Promise<TemplateSection> {
  const response = await axios.post<ApiResponse<TemplateSection>>(`${API_BASE}/admin/template-pages/${pageId}/sections`, data);
  return response.data.data;
}

export async function updateTemplateSection(id: string, data: Partial<TemplateSection>): Promise<TemplateSection> {
  const response = await axios.put<ApiResponse<TemplateSection>>(`${API_BASE}/admin/template-sections/${id}`, data);
  return response.data.data;
}

export async function deleteTemplateSection(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/admin/template-sections/${id}`);
}

// ============ SITES ============

export async function getSites(): Promise<Site[]> {
  const response = await axios.get<ApiResponse<Site[]>>(`${API_BASE}/sites`);
  return response.data.data;
}

export async function getSite(id: string): Promise<Site> {
  const response = await axios.get<ApiResponse<Site>>(`${API_BASE}/sites/${id}`);
  return response.data.data;
}

export interface ProjectInfo {
  name: string;
  description?: string;
  lieu?: string;
  objectif?: string;
  probleme?: string;
}

export async function createSite(templateId: string, projectInfo: ProjectInfo): Promise<Site> {
  const wsId = getActiveWorkspaceId();
  const response = await axios.post<ApiResponse<Site>>(`${API_BASE}/sites`, {
    template_id: templateId,
    name: projectInfo.name,
    description: projectInfo.description,
    lieu: projectInfo.lieu,
    objectif: projectInfo.objectif,
    probleme: projectInfo.probleme,
  }, {
    headers: wsId ? { 'X-Workspace-Id': wsId } : {},
  });
  return response.data.data;
}

export async function updateSite(id: string, data: Partial<Site>): Promise<Site> {
  const response = await axios.put<ApiResponse<Site>>(`${API_BASE}/sites/${id}`, data);
  return response.data.data;
}

export async function deleteSite(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/sites/${id}`);
}

export async function publishSite(id: string, subdomain: string): Promise<Site> {
  const response = await axios.post<ApiResponse<Site>>(`${API_BASE}/sites/${id}/publish`, { subdomain });
  return response.data.data;
}

export async function unpublishSite(id: string): Promise<Site> {
  const response = await axios.post<ApiResponse<Site>>(`${API_BASE}/sites/${id}/unpublish`);
  return response.data.data;
}

export async function addSiteDomain(siteId: string, domain: string): Promise<SiteDomain> {
  const response = await axios.post<ApiResponse<SiteDomain>>(`${API_BASE}/sites/${siteId}/domains`, { domain });
  return response.data.data;
}

export async function verifyDomain(siteId: string, domainId: string): Promise<SiteDomain> {
  const response = await axios.post<ApiResponse<SiteDomain>>(`${API_BASE}/sites/${siteId}/domains/${domainId}/verify`);
  return response.data.data;
}

export async function deleteSiteDomain(siteId: string, domainId: string): Promise<void> {
  await axios.delete(`${API_BASE}/sites/${siteId}/domains/${domainId}`);
}

// ============ SITE PAGES ============

export async function getSitePages(siteId: string): Promise<SitePage[]> {
  const response = await axios.get<ApiResponse<SitePage[]>>(`${API_BASE}/sites/${siteId}/pages`);
  return response.data.data;
}

export async function createSitePage(siteId: string, data: Partial<SitePage>): Promise<SitePage> {
  const response = await axios.post<ApiResponse<SitePage>>(`${API_BASE}/sites/${siteId}/pages`, data);
  return response.data.data;
}

export async function updateSitePage(siteId: string, pageId: string, data: Partial<SitePage>): Promise<SitePage> {
  const response = await axios.put<ApiResponse<SitePage>>(`${API_BASE}/sites/${siteId}/pages/${pageId}`, data);
  return response.data.data;
}

export async function deleteSitePage(siteId: string, pageId: string): Promise<void> {
  await axios.delete(`${API_BASE}/sites/${siteId}/pages/${pageId}`);
}

export async function duplicateSitePage(siteId: string, pageId: string): Promise<SitePage> {
  const response = await axios.post<ApiResponse<SitePage>>(`${API_BASE}/sites/${siteId}/pages/${pageId}/duplicate`);
  return response.data.data;
}

// ============ SITE SECTIONS ============

export async function getSiteSections(pageId: string): Promise<SiteSection[]> {
  const response = await axios.get<ApiResponse<SiteSection[]>>(`${API_BASE}/pages/${pageId}/sections`);
  return response.data.data;
}

export async function createSiteSection(pageId: string, data: Partial<SiteSection>): Promise<SiteSection> {
  const response = await axios.post<ApiResponse<SiteSection>>(`${API_BASE}/pages/${pageId}/sections`, data);
  return response.data.data;
}

export async function updateSiteSection(sectionId: string, data: Partial<SiteSection>): Promise<SiteSection> {
  const response = await axios.put<ApiResponse<SiteSection>>(`${API_BASE}/sections/${sectionId}`, data);
  return response.data.data;
}

export async function deleteSiteSection(sectionId: string): Promise<void> {
  await axios.delete(`${API_BASE}/sections/${sectionId}`);
}

export async function reorderSiteSections(pageId: string, sectionIds: string[]): Promise<void> {
  await axios.put(`${API_BASE}/pages/${pageId}/sections/reorder`, { section_ids: sectionIds });
}

// ============ GLOBAL SECTIONS (navbar/footer) ============

export async function getGlobalSections(siteId: string): Promise<SiteGlobalSection[]> {
  const response = await axios.get<ApiResponse<SiteGlobalSection[]>>(`${API_BASE}/sites/${siteId}/global-sections`);
  return response.data.data;
}

export async function getGlobalSection(siteId: string, position: 'navbar' | 'footer'): Promise<SiteGlobalSection> {
  const response = await axios.get<ApiResponse<SiteGlobalSection>>(`${API_BASE}/sites/${siteId}/global-sections/${position}`);
  return response.data.data;
}

export async function createGlobalSection(siteId: string, data: Partial<SiteGlobalSection>): Promise<SiteGlobalSection> {
  const response = await axios.post<ApiResponse<SiteGlobalSection>>(`${API_BASE}/sites/${siteId}/global-sections`, data);
  return response.data.data;
}

export async function updateGlobalSection(sectionId: string, data: Partial<SiteGlobalSection>): Promise<SiteGlobalSection> {
  const response = await axios.put<ApiResponse<SiteGlobalSection>>(`${API_BASE}/global-sections/${sectionId}`, data);
  return response.data.data;
}

export async function deleteGlobalSection(sectionId: string): Promise<void> {
  await axios.delete(`${API_BASE}/global-sections/${sectionId}`);
}

// ============ SETTINGS ============

export interface SiteBuilderSettings {
  id: number;
  domain_settings: {
    defaultDomain: string;
    allowCustomDomains: boolean;
  };
  branding: {
    platformName: string;
    primaryColor: string;
    logoUrl: string;
  };
  limits: {
    maxSitesPerUser: number;
    maxPagesPerSite: number;
    maxStorageGB: number;
  };
  features: {
    enableAnalytics: boolean;
    enableSEO: boolean;
    enableCustomCode: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    adminAlerts: boolean;
  };
}

// ============ DASHBOARD STATS ============

export interface DashboardStats {
  total_sites: number;
  published_sites: number;
  sites_trend: number;
  total_users: number;
  users_trend: number;
  active_templates: number;
  total_templates: number;
  published_percent: number;
  recent_sites: Array<{
    id: number;
    name: string;
    status: string;
    created_at: string;
    template_name: string | null;
  }>;
  popular_templates: Array<{
    id: number;
    name: string;
    category: string;
    thumbnail: string;
    version: string;
    sites_count: number;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await axios.get<ApiResponse<DashboardStats>>(`${API_BASE}/admin/stats`);
  return response.data.data;
}

export async function getSettings(): Promise<SiteBuilderSettings> {
  const response = await axios.get<ApiResponse<SiteBuilderSettings>>(`${API_BASE}/admin/settings`);
  return response.data.data;
}

export async function updateSettings(data: Partial<SiteBuilderSettings>): Promise<SiteBuilderSettings> {
  const response = await axios.put<ApiResponse<SiteBuilderSettings>>(`${API_BASE}/admin/settings`, data);
  return response.data.data;
}

// ============ PREVIEW ============

export async function getPreviewByToken(token: string): Promise<Site> {
  const response = await axios.get<ApiResponse<Site>>(`${API_BASE}/preview/token/${token}`);
  return response.data.data;
}

export async function getPreviewByDomain(domain: string): Promise<Site> {
  const response = await axios.get<ApiResponse<Site>>(`${API_BASE}/preview/domain/${domain}`);
  return response.data.data;
}

// ============ EXPORT DEFAULT ============

const siteBuilderService = {
  // Section Types
  getSectionTypes,
  getSectionType,

  // Templates
  getTemplates,
  getTemplate,
  getAdminTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  archiveTemplate,

  // Template Image Upload
  uploadTemplateImage,

  // Template Pages
  getTemplatePages,
  createTemplatePage,
  updateTemplatePage,
  deleteTemplatePage,

  // Template Sections
  getTemplateSections,
  createTemplateSection,
  updateTemplateSection,
  deleteTemplateSection,

  // Sites
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  publishSite,
  unpublishSite,
  addSiteDomain,

  // Site Pages
  getSitePages,
  createSitePage,
  updateSitePage,
  deleteSitePage,
  duplicateSitePage,

  // Site Sections
  getSiteSections,
  createSiteSection,
  updateSiteSection,
  deleteSiteSection,
  reorderSiteSections,

  // Global Sections
  getGlobalSections,
  getGlobalSection,
  createGlobalSection,
  updateGlobalSection,
  deleteGlobalSection,

  // Dashboard Stats
  getDashboardStats,

  // Settings
  getSettings,
  updateSettings,

  // Preview
  getPreviewByToken,
  getPreviewByDomain,
};

export default siteBuilderService;
