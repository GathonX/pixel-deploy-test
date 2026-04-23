import { Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DomainSearch from "./pages/DomainSearch";
import Request from "./pages/Request";
import Refund from "./pages/Refund";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isFromWorkspace = new URLSearchParams(location.search).get('from') === 'workspace';
  const isWorkspaceRoute =
    (location.pathname === '/studio-domaine' ||
      location.pathname === '/studio-domaine/' ||
      location.pathname === '/studio-domaine/search') &&
    isFromWorkspace;

  const Layout = isWorkspaceRoute ? WorkspaceLayout : DashboardLayout;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<DomainSearch />} />
        <Route path="/request" element={<Request />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppContent />
  </QueryClientProvider>
);

export default App;
