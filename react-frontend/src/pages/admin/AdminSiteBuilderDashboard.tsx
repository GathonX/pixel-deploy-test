import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlatformProvider } from "@/components/site-builder/src/contexts/PlatformContext";
import SBAdminDashboard from "@/components/site-builder/src/pages/admin/AdminDashboard";

const AdminSiteBuilderDashboard = () => {
  return (
    <AdminLayout>
      <PlatformProvider>
        <SBAdminDashboard embedded basePath="/admin/site-builder" />
      </PlatformProvider>
    </AdminLayout>
  );
};

export default AdminSiteBuilderDashboard;
