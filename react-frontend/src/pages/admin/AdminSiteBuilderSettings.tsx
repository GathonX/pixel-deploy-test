import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlatformProvider } from "@/components/site-builder/src/contexts/PlatformContext";
import SBAdminSettings from "@/components/site-builder/src/pages/admin/AdminSettings";

const AdminSiteBuilderSettings = () => {
  return (
    <AdminLayout>
      <PlatformProvider>
        <SBAdminSettings embedded />
      </PlatformProvider>
    </AdminLayout>
  );
};

export default AdminSiteBuilderSettings;
