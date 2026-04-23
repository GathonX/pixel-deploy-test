import { useState } from 'react';
import { usePlatform } from '../../contexts/PlatformContext';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Trash2,
  Eye,
  Filter,
  Crown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Template } from '@/types/platform';

export default function AdminTemplates({ embedded, basePath = '/site-builder/admin' }: { embedded?: boolean; basePath?: string }) {
  const navigate = useNavigate();
  const { templates, duplicateTemplate, archiveTemplate, deleteTemplate } = usePlatform();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = [...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase()) ||
                         template.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleDuplicate = (template: Template) => {
    duplicateTemplate(template.id);
    toast.success(`Template "${template.name}" dupliqué`);
  };

  const handleArchive = (template: Template) => {
    archiveTemplate(template.id);
    toast.success(`Template "${template.name}" archivé`);
  };

  const handleDelete = (template: Template) => {
    deleteTemplate(template.id);
    toast.success(`Template "${template.name}" supprimé`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Actif</Badge>;
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Archivé</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Templates" embedded={embedded}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="text-muted-foreground">
              Gérez les templates disponibles pour vos utilisateurs
            </p>
          </div>
          <Button asChild>
            <Link to={`${basePath}/templates/new`}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau template
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un template..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group overflow-hidden">
              <div className="relative aspect-video">
                <img 
                  src={template.thumbnail} 
                  alt={template.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toast.info('Aperçu en développement')}>
                    <Eye className="w-4 h-4 mr-1" />
                    Aperçu
                  </Button>
                  <Button size="sm" onClick={() => navigate(`${basePath}/templates/${template.id}`)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Éditer
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`${basePath}/templates/${template.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Éditer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleArchive(template)}>
                        <Archive className="w-4 h-4 mr-2" />
                        Archiver
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(template)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {getStatusBadge(template.status)}
                  <Badge variant="outline">{template.category}</Badge>
                  {template.isPremium ? (
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                      <Crown className="w-3 h-3" />
                      {template.price}€ / {template.priceAriary?.toLocaleString('fr-FR')} Ar
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                      Gratuit
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    v{template.version}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun template trouvé</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
