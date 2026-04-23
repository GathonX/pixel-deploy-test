import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import BookingPage from "./pages/BookingPage";
import SiteViewPage from "./pages/SiteViewPage";
import StatsPage from "./pages/StatsPage";
import ProductsPage from "./pages/ProductsPage";
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import CGVAdminPage from "./pages/CGVAdminPage";
import CGVPublicPage from "./pages/CGVPublicPage";
import SuppliersPage from "./pages/SuppliersPage";
import SettingsPage from "./pages/SettingsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/stats" element={<StatsPage />} />
        <Route path="/dashboard/produits" element={<ProductsPage />} />
        <Route path="/dashboard/produits/:productId" element={<ProductDetailPage />} />
        <Route path="/dashboard/emails" element={<EmailTemplatesPage />} />
        <Route path="/dashboard/cgv" element={<CGVAdminPage />} />
        <Route path="/dashboard/fournisseurs" element={<SuppliersPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/*" element={<DashboardPage />} />
        {/* Site-specific routes */}
        <Route path="/vue-site/:siteId" element={<SiteViewPage />} />
        <Route path="/vue-site/:siteId/produits" element={<ProductsPage />} />
        <Route path="/vue-site/:siteId/produits/:productId" element={<ProductDetailPage />} />
        <Route path="/vue-site/:siteId/stats" element={<StatsPage />} />
        <Route path="/vue-site/:siteId/fournisseurs" element={<SuppliersPage />} />
        <Route path="/vue-site/:siteId/emails" element={<EmailTemplatesPage />} />
        <Route path="/vue-site/:siteId/cgv" element={<CGVAdminPage />} />
        <Route path="/reserver" element={<BookingPage />} />
        <Route path="/cgv/:siteId" element={<CGVPublicPage />} />
        <Route path="/cgv" element={<CGVPublicPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
