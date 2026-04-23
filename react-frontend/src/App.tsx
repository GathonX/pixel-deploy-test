// src/App.tsx - VERSION OPTIMISÉE AVEC LAZY LOADING
import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/providers/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import CookieConsent from "react-cookie-consent";
import axios from "axios";
import cookieConsentService from "./services/cookieConsent";
import { toast } from "@/hooks/use-toast";

// ✅ NOUVEAU : Import pour initialiser les notifications temps réel
import { initializeInteractionQueryClient } from "./services/interactionService";
import { initializeFollowQueryClient } from "./services/followService";

// ✅ BUNDLE MINIMAL - Seulement le loader
import { PageLoader } from "@/utils/critical-imports";

// ✅ TOUTES LES PAGES EN LAZY LOADING - Chunks séparés automatiquement
const Login = React.lazy(() => import("@/pages/Login"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const BlogHome = React.lazy(() => import("@/pages/BlogHome"));
const PublicBlogPost = React.lazy(() => import("@/pages/PublicBlogPost"));
const BlogAuthors = React.lazy(() => import("@/pages/BlogAuthors"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const BlogAuthor = React.lazy(() => import("@/pages/BlogAuthor"));
const BlogEmbedPage = React.lazy(() => import("@/pages/BlogEmbedPage"));
const CalendarPage = React.lazy(() => import("@/pages/CalendarPage"));
const BlogCalendarPage = React.lazy(() => import("@/pages/BlogCalendarPage"));
const VerifyEmail = React.lazy(() => import("@/pages/VerifyEmail"));
const ForgotPassword = React.lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const ThankYouPage = React.lazy(() => import("@/pages/ThankYouPage"));
const TokensPage = React.lazy(() => import("@/pages/TokensPage"));
const TicketsPage = React.lazy(() => import("@/pages/TicketsPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
const ProfilePage = React.lazy(() => import("@/pages/ProfilePage"));
const AssistantsPage = React.lazy(() => import("@/pages/AssistantsPage"));
const Blog = React.lazy(() => import("@/pages/Blog"));
const MarketplaceApp = React.lazy(() => import("@/components/marketplace/src/App"));
const StudioDomaineApp = React.lazy(() => import("@/components/studio-domaine/src/App"));
const SiteBuilderApp = React.lazy(() => import("@/components/site-builder/src/App"));
const CustomDomainSite = React.lazy(() => import("@/components/site-builder/src/pages/CustomDomainSite"));

// Détection domaine custom (calculé une seule fois au chargement)
const PLATFORM_HOST = "app.pixel-rise.com";
const _hostname = window.location.hostname;
const isCustomDomain =
  _hostname !== PLATFORM_HOST &&
  _hostname !== "localhost" &&
  !_hostname.match(/^127\.|^::1$/);
const PurchaseInvoicePage = React.lazy(() => import("@/components/payments/src/components/PurchaseInvoice"));
const PurchasePaymentPage = React.lazy(() => import("@/components/payments/src/components/PurchasePayment"));
const PurchaseConfirmationPage = React.lazy(() => import("@/components/payments/src/components/PurchaseConfirmation"));
const MonActualite = React.lazy(() => import("@/pages/MonActualite"));
const UserBlogHub = React.lazy(() => import("@/pages/UserBlogHub"));
const WorkspaceDashboard = React.lazy(() => import("@/pages/WorkspaceDashboard"));
const WorkspaceBilling = React.lazy(() => import("@/pages/WorkspaceBilling"));
const WorkspaceUsers = React.lazy(() => import("@/pages/WorkspaceUsers"));
const WorkspaceDemandes = React.lazy(() => import("@/pages/WorkspaceDemandes"));
const WorkspacePlanning = React.lazy(() => import("@/pages/WorkspacePlanning"));
const WorkspaceSettings = React.lazy(() => import("@/pages/WorkspaceSettings"));
const WorkspaceManagePage = React.lazy(() => import("@/pages/WorkspaceManagePage"));
const WorkspaceContextPage = React.lazy(() => import("@/pages/WorkspaceContextPage"));
const UserBlogDetails = React.lazy(() => import("@/pages/UserBlogDetails"));
const UserBlogPostEdit = React.lazy(() => import("@/pages/UserBlogPostEdit"));
const CreateBlogPost = React.lazy(() => import("@/pages/CreateBlogPost"));
const AuthorBlogsList = React.lazy(() => import("@/pages/AuthorBlogsList"));
const DefaultBlogPosts = React.lazy(() => import("@/pages/DefaultBlogPosts"));
const DefaultSocialMedia = React.lazy(() => import("@/pages/DefaultSocialMedia"));
const SocialPostDetail = React.lazy(() => import("@/pages/SocialPostDetail"));
const SocialPostEdit = React.lazy(() => import("@/pages/SocialPostEdit"));
const EmbedDashboard = React.lazy(() => import("@/pages/EmbedDashboard"));
const AnalyticsPage = React.lazy(() => import("@/pages/AnalyticsPage"));
const ReservationsDashboard = React.lazy(() => import("@/pages/ReservationsDashboard"));
const ProductsPage = React.lazy(() => import("@/pages/ProductsPage"));
const MadaBookingApp = React.lazy(() => import("@/components/mada-booking/src/App"));
const CgvPublicPage        = React.lazy(() => import("@/pages/CgvPublicPage"));
const PublicBookingWrapper = React.lazy(() => import("@/pages/PublicBookingWrapper"));
const SiteBillingPage = React.lazy(() => import("@/pages/SiteBillingPage"));
const TasksPage = React.lazy(() => import("@/pages/TasksPage"));
const LanguagesPage = React.lazy(() => import("@/pages/LanguagesPage"));
const ContactDashboard = React.lazy(() => import("@/pages/ContactDashboard"));
const SprintViewPage = React.lazy(() => import("@/pages/SprintViewPage"));
const AdminDashboard = React.lazy(() => import("@/pages/AdminDashboard"));
const AdminUsers = React.lazy(() => import("@/pages/AdminUsers"));
const AdminFeatures = React.lazy(() => import("@/pages/AdminFeatures"));
const AdminUserDetail = React.lazy(() => import("@/pages/AdminUserDetail"));
const AdminUserBlogPosts = React.lazy(() => import("@/pages/admin/AdminUserBlogPosts"));
const AdminUserSocialPosts = React.lazy(() => import("@/pages/admin/AdminUserSocialPosts"));
const AdminUserActivity = React.lazy(() => import("@/pages/AdminUserActivity"));
const AdminSecurityLogs = React.lazy(() => import("@/pages/AdminSecurityLogs"));
const AdminSecurityPermissions = React.lazy(() => import("@/pages/AdminSecurityPermissions"));
const AdminTickets = React.lazy(() => import("@/pages/AdminTickets"));
const AdminAIConfig = React.lazy(() => import("@/pages/AdminAIConfig"));
const AdminFinanceRevenue = React.lazy(() => import("@/pages/AdminFinanceRevenue"));
const AdminFinanceTransactions = React.lazy(() => import("@/pages/AdminFinanceTransactions"));
const AdminReportsExport = React.lazy(() => import("@/pages/AdminReportsExport"));
const AdminUserCreate = React.lazy(() => import("@/pages/AdminUserCreate"));
const AdminUserEdit = React.lazy(() => import("@/pages/AdminUserEdit"));
const AdminUserAgentsAdmin = React.lazy(() => import("@/pages/AdminUserAgentsAdmin"));
const AdminUserAgentsUsers = React.lazy(() => import("@/pages/AdminUserAgentsUsers"));
const AdminBlogPosts = React.lazy(() => import("@/pages/AdminBlogPosts"));
const AdminContentGeneration = React.lazy(() => import("@/pages/admin/AdminContentGeneration"));
const AdminStudioDomaine = React.lazy(() => import("@/pages/admin/AdminStudioDomaine"));
const AdminPurchases = React.lazy(() => import("@/pages/admin/AdminPurchases"));
const AdminSiteBuilderDashboard = React.lazy(() => import("@/pages/admin/AdminSiteBuilderDashboard"));
const AdminSiteBuilderTemplates = React.lazy(() => import("@/pages/admin/AdminTemplates"));
const AdminSiteBuilderTemplateEditor = React.lazy(() => import("@/pages/admin/AdminSiteBuilderTemplateEditor"));

const AdminSiteBuilderSettings = React.lazy(() => import("@/pages/admin/AdminSiteBuilderSettings"));
const AdminBillingInvoices = React.lazy(() => import("@/pages/admin/AdminBillingInvoices"));
const AdminWorkspaces = React.lazy(() => import("@/pages/admin/AdminWorkspaces"));
const AdminEmbedCodes = React.lazy(() => import("@/pages/AdminEmbedCodes"));
const UserFeatures = React.lazy(() => import("@/pages/UserFeatures"));
const FeaturePurchase = React.lazy(() => import("@/pages/FeaturePurchase"));
const PaymentConfirmation = React.lazy(() => import("@/pages/PaymentConfirmation"));
const PaymentHistory = React.lazy(() => import("@/pages/PaymentHistory"));
const NotificationsPage = React.lazy(() => import("@/pages/NotificationsPage"));
const ChangePassword = React.lazy(() => import("@/pages/ChangePassword"));
const DebugAnalytics = React.lazy(() => import("@/pages/DebugAnalytics"));
const InvoicePage = React.lazy(() => import("@/pages/InvoicePage"));
const HiddenContentsPage = React.lazy(() => import("@/pages/HiddenContentsPage"));
const InvitationAccept = React.lazy(() => import("@/pages/InvitationAccept"));

// ✅ Import composants NON-LAZY (critiques pour le rendu initial)
import GlobalProgressiveGeneration from "@/components/global/GlobalProgressiveGeneration";
import CookieConsentDebug from "@/components/debug/CookieConsentDebug";
import Register from "@/components/chat/Register";
import AgentWrapper from "@/components/agent/AgentWrapper";
import SEOHead from "@/components/SEOHead";
import { HelmetProvider } from 'react-helmet-async';
import { BetaBanner } from "@/components/global/BetaBanner";

// ✅ Import des utilitaires de test agent (en développement seulement)
if (import.meta.env.DEV) {
  import("@/utils/agentTestUtils");
}

// ✅ Types Google Analytics définis dans le service dédié

// ✅ Service de consentement unifié - plus besoin de logique d'authentification complexe

// ✅ Fonction supprimée - désormais gérée par cookieConsentService

// ✅ COMPOSANT DE REDIRECTION VERS LANDING PAGE
const LandingRedirect: React.FC<{ path?: string }> = ({ path = "" }) => {
  useEffect(() => {
    // ✅ URL dynamique selon l'environnement
    const landingUrl =
      import.meta.env.VITE_LANDING_URL || "https://pixel-rise.com";
    const redirectUrl = `${landingUrl}${path}`;

    console.log(`🔄 Redirection vers landing page: ${redirectUrl}`);
    window.location.href = redirectUrl;
  }, [path]);

  return (
    <>
      <SEOHead
        title="Pixel Rise – Plateforme SaaS d'automatisation marketing par IA"
        description="Découvrez Pixel Rise, une plateforme SaaS innovante dédiée à l'automatisation marketing avec IA. Business plan automatisé, création de contenus SEO, gestion réseaux sociaux et reporting en temps réel."
        keywords="marketing automation IA, plateforme SaaS marketing, business plan automatisé, création contenu SEO, gestion réseaux sociaux IA"
        canonicalUrl="https://pixel-rise.com"
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center p-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Redirection en cours...
          </h2>

          <p className="text-gray-600 mb-6">
            Vous allez être redirigé vers la page d'accueil PixelRise
          </p>

          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    </>
  );
};

const AppRoutes: React.FC = () => {
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const location = useLocation();
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  // ✅ Initialisation Google Analytics avec le code Google exact
  const initializeAnalytics = useCallback((): void => {
    if (isAnalyticsLoading) return;
    
    setIsAnalyticsLoading(true);
    try {
      // Vérifier si déjà chargé dans index.html
      if (window.gtag && window.dataLayer) {
        console.log('✅ Google Analytics déjà initialisé depuis index.html');
        // Envoyer événement de consentement
        window.gtag?.('event', 'consent_accepted', {
          event_category: 'privacy'
        });
        return;
      }

      // Sinon charger dynamiquement avec le code Google exact
      console.log('🔄 Chargement dynamique Google Analytics...');
      
      // Script Google Analytics exact comme fourni
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-CYH5VGVLTS';
      document.head.appendChild(script);
      
      script.onload = () => {
        // Configuration Google Analytics exacte
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]){window.dataLayer.push(args);}
        gtag('js', new Date());
        gtag('config', 'G-CYH5VGVLTS');
        
        // Rendre gtag disponible globalement
        window.gtag = gtag;
        
        console.log('✅ Google Analytics chargé dynamiquement');
        
        // Envoyer événement de consentement
        gtag('event', 'consent_accepted', {
          event_category: 'privacy'
        } as any);
      };
      
    } catch (error) {
      console.error('❌ Erreur chargement Google Analytics:', error);
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, [isAnalyticsLoading]);

  // ✅ Gestion améliorée de l'acceptation avec feedback utilisateur
  const handleAccept = async () => {
    try {
      console.log('📤 Acceptation du consentement...');
      
      const result = await cookieConsentService.acceptConsent();
      
      if (result.success) {
        console.log('✅ Consentement accepté:', result.data.message);
        
        // Sauvegarder localement
        cookieConsentService.storeConsent(true);
        setTrackingEnabled(true);
        
        // Initialiser Analytics
        await initializeAnalytics();
        
        toast({
          title: "✅ Consentement enregistré",
          description: "Vos préférences ont été sauvegardées avec succès.",
        });
      } else {
        // ✅ Type guard pour accéder aux propriétés d'erreur
        const errorInfo = 'error' in result ? result.error : { message: 'Erreur inconnue', details: undefined, shouldRetry: false };
        console.error('❌ Échec consentement:', errorInfo.message);
        
        toast({
          title: "⚠️ Problème de consentement",
          description: errorInfo.details || errorInfo.message,
          variant: "destructive",
        });
        
        // En cas d'échec, on sauvegarde quand même localement pour UX
        if (errorInfo.shouldRetry) {
          cookieConsentService.storeConsent(true);
          setTrackingEnabled(true);
        }
      }
    } catch (error) {
      console.error('❌ Erreur critique lors de l\'acceptation:', error);
      
      toast({
        title: "❌ Erreur inattendue",
        description: "Impossible d'enregistrer vos préférences. Veuillez recharger la page.",
        variant: "destructive",
      });
    }
  };

  // ✅ Gestion améliorée du refus avec feedback utilisateur
  const handleDecline = async () => {
    try {
      console.log('🚫 Refus du consentement...');
      
      const result = await cookieConsentService.declineConsent();
      
      if (result.success) {
        console.log('✅ Consentement refusé:', result.data.message);
        
        cookieConsentService.storeConsent(false);
        setTrackingEnabled(false);
        
        // Envoyer événement de refus si gtag disponible
        window.gtag?.('event', 'consent_declined', {
          event_category: 'privacy'
        });
        
        toast({
          title: "🚫 Consentement refusé",
          description: "Aucun tracking ne sera effectué.",
        });
      } else {
        // ✅ Type guard pour accéder aux propriétés d'erreur
        const errorInfo = 'error' in result ? result.error : { message: 'Erreur inconnue', details: undefined, shouldRetry: false };
        console.error('❌ Échec refus:', errorInfo.message);
        
        // Même en cas d'échec serveur, respecter le choix utilisateur
        cookieConsentService.storeConsent(false);
        setTrackingEnabled(false);
        
        toast({
          title: "⚠️ Consentement refusé (local)",
          description: "Vos préférences ont été enregistrées localement.",
        });
      }
    } catch (error) {
      console.error('❌ Erreur critique lors du refus:', error);
      
      // Toujours respecter la volonté de l'utilisateur
      cookieConsentService.storeConsent(false);
      setTrackingEnabled(false);
      
      toast({
        title: "🚫 Consentement refusé",
        description: "Aucun tracking ne sera effectué (sauvegarde locale).",
      });
    }
  };

  // ✅ Initialisation améliorée avec gestion des préférences stockées
  useEffect(() => {
    const { hasConsent, consentValue } = cookieConsentService.hasStoredConsent();
    
    if (hasConsent && consentValue === true) {
      console.log('💾 Consentement précédemment accepté, réinitialisation...');
      
      setTrackingEnabled(true);
      
      // Réenvoyer le consentement au serveur et initialiser Analytics
      (async () => {
        try {
          const result = await cookieConsentService.acceptConsent();
          if (result.success) {
            await initializeAnalytics();
          } else {
            const errorInfo = 'error' in result ? result.error : { message: 'Erreur inconnue' };
            console.warn('⚠️ Échec réenvoi consentement (continuons avec local):', errorInfo.message);
            // Initialiser Analytics quand même si stockage local dit OUI
            await initializeAnalytics();
          }
        } catch (error) {
          console.warn('⚠️ Erreur réinitialisation (continuons):', error);
          // ✅ Pas de blocage, on garde les préférences locales
          await initializeAnalytics();
        }
      })();
    } else if (hasConsent && consentValue === false) {
      console.log('🚫 Consentement précédemment refusé');
      setTrackingEnabled(false);
    }
  }, [initializeAnalytics]);

  // ✅ Tracking des pages avec gtag Google direct
  useEffect(() => {
    if (trackingEnabled && window.gtag) {
      const fullPath = location.pathname + location.search;
      
      console.log('📊 Tracking page vue:', fullPath);
      window.gtag?.('event', 'page_view', {
        page_path: fullPath,
        page_location: window.location.href,
        page_title: document.title
      });
    }
  }, [trackingEnabled, location.pathname, location.search]);

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* 🆕 ROUTES PAYMENT SYSTEM - INTÉGRÉES */}
        {/* <Route
          path="/payments/*"
          element={
            <ProtectedRoute>
              <PaymentApp />
            </ProtectedRoute>
          }
        /> */}
        {/* 🛒 ROUTE MARKETPLACE - Module e-commerce intégré */}
        <Route
          path="/marketplace/*"
          element={
            <ProtectedRoute requireEmailVerification={false}>
              <MarketplaceApp />
            </ProtectedRoute>
          }
        />
        {/* 🌐 ROUTE STUDIO DOMAINE - Gestion des noms de domaine (utilisateurs uniquement) */}
        <Route
          path="/studio-domaine/*"
          element={
            <ProtectedRoute requireEmailVerification={false} userOnly>
              <StudioDomaineApp />
            </ProtectedRoute>
          }
        />
        {/* 🏗️ ROUTE SITE BUILDER - Constructeur de sites web */}
        <Route
          path="/site-builder/*"
          element={
            <ProtectedRoute requireEmailVerification={false}>
              <SiteBuilderApp />
            </ProtectedRoute>
          }
        />
        {/* 💳 ROUTES ACHAT GÉNÉRIQUE - Facture et confirmation (site-builder, studio-domain, etc.) */}
        <Route
          path="/purchases/invoice/:orderId"
          element={
            <ProtectedRoute requireEmailVerification={false}>
              <PurchaseInvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/payment/:orderId"
          element={
            <ProtectedRoute requireEmailVerification={false}>
              <PurchasePaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/confirmation/:orderId"
          element={
            <ProtectedRoute requireEmailVerification={false}>
              <PurchaseConfirmationPage />
            </ProtectedRoute>
          }
        />
        {/* 🌐 REDIRECTIONS VERS LANDING PAGE PIXEL-RISE.COM */}
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/about" element={<LandingRedirect path="/about" />} />
        <Route
          path="/how-it-works"
          element={<LandingRedirect path="/how-it-works" />}
        />
        <Route path="/contact" element={<LandingRedirect path="/contact" />} />
        <Route path="/pricing" element={<LandingRedirect path="/pricing" />} />
        {/* 📰 ROUTES BLOG PUBLIQUES - GARDÉES DANS L'APP */}
        <Route path="/blog" element={<BlogHome />} />
        <Route path="/blog/authors" element={<BlogAuthors />} />
        <Route path="/blog/category/:category" element={<BlogHome />} />
        <Route path="/blog/tag/:tag" element={<BlogHome />} />
        <Route path="/blog/:slug" element={<PublicBlogPost />} />
        <Route path="/blog/author/:id" element={<BlogAuthor />} />
        {/* 🔗 ROUTES SPÉCIALES - GARDÉES DANS L'APP */}
        <Route path="/embed/blog/:slug" element={<BlogEmbedPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/blog-calendar" element={<BlogCalendarPage />} />
        {/* ✅ Invitation - Route publique (pas de auth requis) */}
        <Route path="/invitation/accept/:token" element={<InvitationAccept />} />

        {/* 🔐 Routes Auth - WORKFLOW SÉCURISÉ SEULEMENT */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        {/* ✅ ROUTES DE VÉRIFICATION EMAIL - VERSION SÉCURISÉE UNIQUEMENT */}
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmail />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/password-reset/:token"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        {/* 💳 Billing workspace (appartient au workspace, pas à un projet) */}
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <WorkspaceBilling />
            </ProtectedRoute>
          }
        />
        {/* 🏢 Workspace — Mes sites */}
        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <WorkspaceDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/billing"
          element={<Navigate to="/billing" replace />}
        />
        <Route
          path="/workspace/users"
          element={
            <ProtectedRoute>
              <WorkspaceUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/demandes"
          element={
            <ProtectedRoute>
              <WorkspaceDemandes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/planning"
          element={
            <ProtectedRoute>
              <WorkspacePlanning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/settings"
          element={
            <ProtectedRoute>
              <WorkspaceSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/manage/:workspaceId"
          element={
            <ProtectedRoute>
              <WorkspaceManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId"
          element={
            <ProtectedRoute>
              <WorkspaceContextPage />
            </ProtectedRoute>
          }
        />

        {/* 🔒 Routes protégées utilisateur */}
        <Route
          path="/dashboard"
          element={<Navigate to="/workspace" replace />}
        />
        <Route
          path="/dashboard/embed"
          element={
            <ProtectedRoute>
              <EmbedDashboard />
            </ProtectedRoute>
          }
        />
        {/* ✅ NOUVEAU : Route Dashboard Réservations */}
        <Route
          path="/dashboard/reservations"
          element={
            <ProtectedRoute>
              <ReservationsDashboard />
            </ProtectedRoute>
          }
        />
        {/* ✅ NOUVEAU : Route Dashboard Contacts */}
        <Route
          path="/dashboard/contacts"
          element={
            <ProtectedRoute>
              <ContactDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sprint-view"
          element={
            <ProtectedRoute>
              <SprintViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/thank-you"
          element={
            <ProtectedRoute>
              <ThankYouPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tokens"
          element={
            <ProtectedRoute>
              <TokensPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tickets"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:ticketId"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tasks"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/languages"
          element={
            <ProtectedRoute>
              <LanguagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/assistants"
          element={
            <ProtectedRoute>
              <AssistantsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/blog"
          element={
            <ProtectedRoute>
              <Blog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/default-social"
          element={
            <ProtectedRoute>
              <DefaultSocialMedia />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/default-blog"
          element={
            <ProtectedRoute>
              <DefaultBlogPosts />
            </ProtectedRoute>
          }
        />
        {/* ✅ Routes site-specific : /dashboard/site/:siteId/* */}
        <Route
          path="/dashboard/site/:siteId"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/site/:siteId/reservations"
          element={
            <ProtectedRoute>
              <ReservationsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/site/:siteId/blog"
          element={
            <ProtectedRoute>
              <DefaultBlogPosts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/site/:siteId/blog/create"
          element={<ProtectedRoute><CreateBlogPost /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/site/:siteId/social"
          element={
            <ProtectedRoute>
              <DefaultSocialMedia />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/site/:siteId/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/site/:siteId/languages"
          element={<ProtectedRoute><LanguagesPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/site/:siteId/settings"
          element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/site/:siteId/calendar"
          element={<ProtectedRoute><CalendarPage /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/site/:siteId/mon-actualite"
          element={<ProtectedRoute><MonActualite /></ProtectedRoute>}
        />
        {/* Page formulaire de réservation publique (sans auth) */}
        <Route path="/mada-booking/reserver" element={<PublicBookingWrapper />} />
        {/* Page CGV publique standalone — propre, sans sub-app chrome */}
        <Route path="/mada-booking/cgv/:siteId" element={<CgvPublicPage />} />
        <Route path="/mada-booking/cgv" element={<CgvPublicPage />} />
        {/* Reste du mada-booking (dashboard, settings, vue-site…) — protégé */}
        <Route
          path="/mada-booking/*"
          element={<ProtectedRoute><MadaBookingApp /></ProtectedRoute>}
        />
        <Route
          path="/dashboard/site/:siteId/billing"
          element={<ProtectedRoute><SiteBillingPage /></ProtectedRoute>}
        />

        <Route
          path="/payment-confirmation"
          element={
            <ProtectedRoute>
              <PaymentConfirmation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/payment-history"
          element={
            <ProtectedRoute>
              <PaymentHistory />
            </ProtectedRoute>
          }
        />
        // OU si vous voulez la rendre accessible depuis /features/history
        <Route
          path="/features/history"
          element={
            <ProtectedRoute>
              <PaymentHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social-media/post/:id"
          element={
            <ProtectedRoute>
              <SocialPostDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social-media/post/:id/edit"
          element={
            <ProtectedRoute>
              <SocialPostEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mon-actualite"
          element={
            <ProtectedRoute>
              <MonActualite />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-blogs"
          element={
            <ProtectedRoute>
              <UserBlogHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-blogs/:slug"
          element={
            <ProtectedRoute>
              <UserBlogDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/author/:authorId/blogs"
          element={
            <ProtectedRoute>
              <AuthorBlogsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/blog/edit/:id"
          element={
            <ProtectedRoute>
              <UserBlogPostEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/blog/create"
          element={
            <ProtectedRoute>
              <CreateBlogPost />
            </ProtectedRoute>
          }
        />
        {/* 🎯 SYSTÈME DE FONCTIONNALITÉS - Routes utilisateur */}
        <Route
          path="/features"
          element={
            <ProtectedRoute>
              <UserFeatures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/features/purchase/:featureId"
          element={
            <ProtectedRoute>
              <FeaturePurchase />
            </ProtectedRoute>
          }
        />
        <Route
          path="/features/invoice/:invoiceId"
          element={
            <ProtectedRoute>
              <InvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contenus-masques"
          element={
            <ProtectedRoute>
              <HiddenContentsPage />
            </ProtectedRoute>
          }
        />
        {/* 🛡️ Admin routes (adminOnly — non-admins are redirected to /dashboard) */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user-agents/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserAgentsAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user-agents/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserAgentsUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/create"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserCreate />
            </ProtectedRoute>
          }
        />
        {/* ✅ NOUVEAU : Routes pour les contenus utilisateur */}
        <Route
          path="/admin/users/:userId/blog-posts"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserBlogPosts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId/social-posts"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserSocialPosts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId/edit"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/activity"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserActivity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security/logs"
          element={
            <ProtectedRoute adminOnly>
              <AdminSecurityLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security/permissions"
          element={
            <ProtectedRoute adminOnly>
              <AdminSecurityPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute adminOnly>
              <AdminTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets/:ticketId"
          element={
            <ProtectedRoute adminOnly>
              <AdminTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-config"
          element={
            <ProtectedRoute adminOnly>
              <AdminAIConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/finance/revenue"
          element={
            <ProtectedRoute adminOnly>
              <AdminFinanceRevenue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/finance/transactions"
          element={
            <ProtectedRoute adminOnly>
              <AdminFinanceTransactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports/export"
          element={
            <ProtectedRoute adminOnly>
              <AdminReportsExport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/blog-posts"
          element={
            <ProtectedRoute adminOnly>
              <AdminBlogPosts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content-generation"
          element={
            <ProtectedRoute adminOnly>
              <AdminContentGeneration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/embed-codes"
          element={
            <ProtectedRoute adminOnly>
              <AdminEmbedCodes />
            </ProtectedRoute>
          }
        />
        {/* 🎯 SYSTÈME DE FONCTIONNALITÉS - Routes admin */}
        <Route
          path="/admin/features"
          element={
            <ProtectedRoute adminOnly>
              <AdminFeatures />
            </ProtectedRoute>
          }
        />
        {/* 🌐 STUDIO DOMAINE - Administration */}
        <Route
          path="/admin/studio-domaine"
          element={
            <ProtectedRoute adminOnly>
              <AdminStudioDomaine />
            </ProtectedRoute>
          }
        />
        {/* 🏗️ SITE BUILDER - Administration */}
        <Route
          path="/admin/site-builder"
          element={
            <ProtectedRoute adminOnly>
              <AdminSiteBuilderDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/site-builder/templates"
          element={
            <ProtectedRoute adminOnly>
              <AdminSiteBuilderTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/site-builder/templates/new"
          element={
            <ProtectedRoute adminOnly>
              <AdminSiteBuilderTemplateEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/site-builder/templates/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminSiteBuilderTemplateEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/site-builder/purchases"
          element={
            <ProtectedRoute adminOnly>
              <AdminPurchases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/site-builder/settings"
          element={
            <ProtectedRoute adminOnly>
              <AdminSiteBuilderSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/billing/invoices"
          element={
            <ProtectedRoute adminOnly>
              <AdminBillingInvoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/workspaces"
          element={
            <ProtectedRoute adminOnly>
              <AdminWorkspaces />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/success"
          element={
            <ProtectedRoute>
              <Navigate
                to={`/payments/payment/success${window.location.search}`}
                replace
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/cancel"
          element={
            <ProtectedRoute>
              <Navigate
                to={`/payments/payment/cancel${window.location.search}`}
                replace
              />
            </ProtectedRoute>
          }
        />
        {/* 🧪 Route Debug - Development Only */}
        {import.meta.env.VITE_APP_DEBUG === 'true' && (
          <Route path="/debug/analytics" element={<DebugAnalytics />} />
        )}
        
        {/* ❌ Route 404 */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <CookieConsent
        location="bottom"
        buttonText="J'accepte"
        declineButtonText="Refuser"
        cookieName="cookie_consent"
        style={{
          background: "#1E293B",
          color: "#F8FAFC",
          fontSize: "1.1rem",
          padding: "1.5rem 2rem",
          borderTop: "6px solid #F97316",
          boxShadow: "0 0 20px rgba(0,0,0,0.4)",
          zIndex: 9999,
        }}
        buttonStyle={{
          background: "#22C55E",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1rem",
          padding: "0.6rem 1.5rem",
          borderRadius: "0.5rem",
        }}
        declineButtonStyle={{
          background: "#EF4444",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1rem",
          padding: "0.6rem 1.5rem",
          borderRadius: "0.5rem",
        }}
        overlay
        enableDeclineButton
        expires={150}
        onAccept={handleAccept}
        onDecline={handleDecline}
      >
        🎯 Ce site utilise des cookies pour améliorer votre expérience.
        Acceptez-vous leur utilisation ?
      </CookieConsent>
    </>
  );
};

const App: React.FC = () => {
  // Sur un domaine custom (pas app.pixel-rise.com) → afficher le site public directement
  if (isCustomDomain) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>}>
        <CustomDomainSite />
      </Suspense>
    );
  }

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // ✅ NOUVEAU : Initialiser le QueryClient pour les notifications temps réel
  useEffect(() => {
    initializeInteractionQueryClient(queryClient);
    initializeFollowQueryClient(queryClient);
    console.log(
      "🔔 QueryClient initialisé pour les notifications temps réel (interactions + follow)"
    );
  }, [queryClient]);

  // 🔍 DEBUG LOG
  console.log("🚀 App.tsx - HelmetProvider initialisé");

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {/* ✅ TOASTER EXISTANT (Radix UI) */}
          <Toaster />

          {/* ✅ TOASTER SONNER CORRIGÉ - Configuration centralisée dans le composant */}
          <SonnerToaster />

          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <AgentWrapper>
                <AppRoutes />

                {/* ✅ NOUVEAU : Génération progressive globale (indépendante des pages) */}
                <GlobalProgressiveGeneration />
              </AgentWrapper>
            </AuthProvider>

            {/* ✅ Debug Panel - Development Only */}
            {import.meta.env.VITE_APP_DEBUG === 'true' && <CookieConsentDebug />}
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
