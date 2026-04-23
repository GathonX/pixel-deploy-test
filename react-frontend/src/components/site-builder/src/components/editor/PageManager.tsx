import { useState } from 'react';
import { Page } from '@/types/platform';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  Plus, Layers, MoreVertical, Pencil, Copy, Trash2, 
  Home, FileText, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

interface PageManagerProps {
  pages: Page[];
  currentPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name: string, slug: string) => void;
  onDeletePage: (pageId: string) => void;
  onUpdatePage: (pageId: string, updates: Partial<Page>) => void;
  onDuplicatePage: (pageId: string) => void;
}

export function PageManager({
  pages,
  currentPageId,
  onSelectPage,
  onAddPage,
  onDeletePage,
  onUpdatePage,
  onDuplicatePage
}: PageManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');

  const handleAddPage = () => {
    if (!newPageName.trim()) return;
    const slug = newPageSlug.trim() || newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    onAddPage(newPageName.trim(), slug);
    setNewPageName('');
    setNewPageSlug('');
    setShowAddDialog(false);
    toast.success('Page créée');
  };

  const handleEditPage = () => {
    if (!editingPage || !newPageName.trim()) return;
    onUpdatePage(editingPage.id, {
      name: newPageName.trim(),
      slug: newPageSlug.trim() || editingPage.slug
    });
    setEditingPage(null);
    setNewPageName('');
    setNewPageSlug('');
    setShowEditDialog(false);
    toast.success('Page modifiée');
  };

  const openEditDialog = (page: Page) => {
    setEditingPage(page);
    setNewPageName(page.name);
    setNewPageSlug(page.slug);
    setShowEditDialog(true);
  };

  const handleDeletePage = (page: Page) => {
    if (pages.length <= 1) {
      toast.error('Impossible de supprimer la dernière page');
      return;
    }
    onDeletePage(page.id);
    toast.success('Page supprimée');
  };

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Pages</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.map((page) => (
            <div 
              key={page.id}
              className={`
                group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors
                ${currentPageId === page.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'hover:bg-muted'
                }
              `}
              onClick={() => onSelectPage(page.id)}
            >
              <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-50 cursor-grab" />
              {page.slug === '/' ? (
                <Home className="w-4 h-4 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1 truncate text-sm font-medium">{page.name}</span>
              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                {page.slug}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(page); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicatePage(page.id); }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDeletePage(page); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Add Page Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle page</DialogTitle>
            <DialogDescription>
              Créez une nouvelle page pour votre site
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pageName">Nom de la page</Label>
              <Input
                id="pageName"
                placeholder="À propos, Contact, Services..."
                value={newPageName}
                onChange={(e) => {
                  setNewPageName(e.target.value);
                  if (!newPageSlug || newPageSlug === newPageName.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                    setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageSlug">URL de la page</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="pageSlug"
                  placeholder="a-propos"
                  value={newPageSlug.replace(/^\//, '')}
                  onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddPage} disabled={!newPageName.trim()}>
              Créer la page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editPageName">Nom de la page</Label>
              <Input
                id="editPageName"
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPageSlug">URL de la page</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="editPageSlug"
                  value={newPageSlug.replace(/^\//, '')}
                  onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={editingPage?.slug === '/'}
                />
              </div>
              {editingPage?.slug === '/' && (
                <p className="text-xs text-muted-foreground">
                  L'URL de la page d'accueil ne peut pas être modifiée
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditPage} disabled={!newPageName.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
