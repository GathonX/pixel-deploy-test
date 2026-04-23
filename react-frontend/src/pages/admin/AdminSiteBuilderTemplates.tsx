import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlatformProvider } from "@/components/site-builder/src/contexts/PlatformContext";
import SBAdminTemplates from "@/components/site-builder/src/pages/admin/AdminTemplates";

const AdminSiteBuilderTemplates = () => {
  return (
    <AdminLayout>
      <PlatformProvider>
        <SBAdminTemplates embedded basePath="/admin/site-builder" />
      </PlatformProvider>
    </AdminLayout>
  );
};

export default AdminSiteBuilderTemplates;
