import { Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlatformProvider } from "./contexts/PlatformContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import Index from "./pages/Index";
import Editor from "./pages/Editor";
import Preview from "./pages/Preview";
import PublicPreview from "./pages/PublicPreview";
import Domains from "./pages/Domains";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminTemplateEditor from "./pages/admin/AdminTemplateEditor";
import AdminSettings from "./pages/admin/AdminSettings";
import CustomDomainSite from "./pages/CustomDomainSite";

const queryClient = new QueryClient();

// Detect if the SPA is running on a custom domain (not the main platform)
const PLATFORM_HOST = 'app.pixel-rise.com';
const hostname = window.location.hostname;
const isCustomDomain = hostname !== PLATFORM_HOST && hostname !== 'localhost' && !hostname.match(/^127\.|^::1$/);

// Composant interne pour gérer le layout conditionnel
const AppContent = () => {
  const location = useLocation();

  // Routes de preview & éditeur → afficher SANS layout (plein écran)
  const isPreviewRoute = location.pathname.includes('/preview/');
  const isEditorRoute  = location.pathname.includes('/editor/');

  if (isPreviewRoute || isEditorRoute) {
    // Plein écran, sans sidebar ni navbar de l'application
    return (
      <Routes>
        <Route path="/preview/:token" element={<Preview />} />
        <Route path="/preview/:userId/:templateName/:siteName/:token" element={<PublicPreview />} />
        <Route path="/editor/:siteId" element={<Editor />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // Page liste des sites → toujours WorkspaceLayout (appartient au workspace, pas à un projet)
  const isRootRoute = location.pathname === '/site-builder' || location.pathname === '/site-builder/';

  if (isRootRoute) {
    return (
      <WorkspaceLayout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </WorkspaceLayout>
    );
  }

  // Routes projet (éditeur, domaines, admin) → DashboardLayout
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/editor/:siteId" element={<Editor />} />
        <Route path="/domains/:siteId" element={<Domains />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/templates" element={<AdminTemplates />} />
        <Route path="/admin/templates/:id" element={<AdminTemplateEditor />} />

        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
};

const App = () => {
  // On a custom domain: render the public site directly, no auth/PlatformContext needed
  if (isCustomDomain) {
    return (
      <QueryClientProvider client={queryClient}>
        <CustomDomainSite />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformProvider>
        <AppContent />
      </PlatformProvider>
    </QueryClientProvider>
  );
};

export default App;
