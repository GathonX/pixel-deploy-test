import React from 'react';
import { useNavigate } from 'react-router-dom';           // ← importez useNavigate
import { AdminLayout } from '@/components/admin/AdminLayout';
import UsersTable from '@/components/admin/UsersTable';
import { Button } from '@/components/ui/button';
import { FileText, UserCog } from 'lucide-react';

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();                           // ← initialisez le hook

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header with title and actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Utilisateurs</h1>
            <p className="text-muted-foreground">Gérez tous les utilisateurs de votre plateforme</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            {/* ← Ajout du onClick pour naviguer vers la page de création */}
            <Button
              size="sm"
              className="flex items-center"
              onClick={() => navigate('/admin/users/create')}
            >
              <UserCog className="h-4 w-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          </div>
        </div>

        {/* Users list table component */}
        <UsersTable />
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
