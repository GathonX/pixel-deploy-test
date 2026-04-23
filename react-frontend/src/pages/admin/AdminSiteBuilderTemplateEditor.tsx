import { AdminLayout } from "@/components/admin/AdminLayout";
import { PlatformProvider } from "@/components/site-builder/src/contexts/PlatformContext";
import SBAdminTemplateEditor from "@/components/site-builder/src/pages/admin/AdminTemplateEditor";

const AdminSiteBuilderTemplateEditor = () => {
  return (
    <AdminLayout>
      <PlatformProvider>
        <SBAdminTemplateEditor embedded basePath="/admin/site-builder" />
      </PlatformProvider>
    </AdminLayout>
  );
};

export default AdminSiteBuilderTemplateEditor;
