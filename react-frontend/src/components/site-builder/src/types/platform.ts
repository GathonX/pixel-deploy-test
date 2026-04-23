// Platform Types for SaaS Website Builder

export type TemplateStatus = 'draft' | 'active' | 'archived';
export type SiteStatus = 'draft' | 'published';
export type DomainType = 'subdomain' | 'custom';
export type DomainStatus = 'pending' | 'verified' | 'error';

export interface SectionType {
  id: string;
  name: string;
  schema: Record<string, unknown>;
  defaultContent: Record<string, unknown>;
  defaultStyles: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  version: string;
  status: TemplateStatus;
  price: number | null; // null = gratuit, number = prix en euros
  priceAriary: number | null; // null = gratuit, number = prix en Ariary malagasy
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePage {
  id: string;
  templateId: string;
  name: string;
  slug: string;
  order: number;
}

export interface TemplateSection {
  id: string;
  templatePageId: string;
  sectionTypeId: string;
  order: number;
  defaultContent: Record<string, unknown>;
  defaultStyles: Record<string, unknown>;
}

// SEO Configuration
export interface SeoConfig {
  // Basic SEO
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string[];
  favicon?: string;
  ogImage?: string;
  
  // Robots & Indexing
  robotsIndex: boolean;
  robotsFollow: boolean;
  canonicalUrl?: string;
  
  // Google
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  googleSearchConsoleId?: string;
  
  // Facebook
  facebookPixelId?: string;
  facebookAppId?: string;
  
  // Twitter
  twitterHandle?: string;
  twitterCardType?: 'summary' | 'summary_large_image';
  
  // Other
  customHeadCode?: string;
  customBodyCode?: string;

  // Contact
  contactEmail?: string;
}

export interface Site {
  id: string;
  userId: string;
  name: string;
  sourceTemplateId: string;
  status: SiteStatus;
  globalStyles: Record<string, unknown>;
  seoConfig?: SeoConfig;
  previewToken: string; // Unique token for preview access
  subdomain?: string; // Only set after publication
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Plan propre au site : 'draft' | 'starter' | 'pro' — indépendant du plan workspace */
  effectivePlanKey?: 'draft' | 'starter' | 'pro';
  workspaceId?: string;
  workspaceName?: string;
}

export interface Page {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  order: number;
  isPublished: boolean;
}

export interface Section {
  id: string;
  pageId: string;
  sectionTypeId: string;
  order: number;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
  translations: Record<string, Record<string, unknown>>;
}

export interface SiteLang {
  code: string;
  name: string;
  flag: string;
  isDefault: boolean;
}

export interface Domain {
  id: string;
  siteId: string;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
  sitesCount?: number;
}

export interface AdminStats {
  totalSites: number;
  totalUsers: number;
  totalTemplates: number;
  publishedSites: number;
  draftSites: number;
  activeTemplates: number;
  recentSites: Site[];
  recentUsers: User[];
}
