import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Template } from '@/types/platform';
import { usePlatform } from '../../contexts/PlatformContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Crown, Lock, FolderOpen, MapPin, Target, AlertCircle } from 'lucide-react';
import { createPurchase } from '../../../../payments/src/services/purchaseService';
import { getActiveWorkspaceId, setActiveWorkspaceId } from '@/services/api';
import { workspaceService } from '@/services/workspaceService';

interface CreateSiteDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkspaceId?: string;
}

export function CreateSiteDialog({ template, open, onOpenChange, defaultWorkspaceId }: CreateSiteDialogProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    lieu: '',
    objectif: '',
    probleme: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{id: string; name: string; plan_key: string|null}>>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const { instantiateSite } = usePlatform();
  const navigate = useNavigate();

  const isPremium = template?.isPremium ?? false;

  useEffect(() => {
    if (!open) return;
    workspaceService.getOwnerWorkspaces()
      .then(wsList => {
        const active = wsList.filter(ws => !ws.is_delivered);
        setWorkspaces(active);
        const preferredId = defaultWorkspaceId ?? getActiveWorkspaceId();
        const found = preferredId && active.find(w => String(w.id) === String(preferredId));
        if (found) {
          setSelectedWorkspaceId(String(found.id));
        } else if (active.length > 0) {
          setSelectedWorkspaceId(String(active[0].id));
        }
      })
      .catch(() => {});
  }, [open, defaultWorkspaceId]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!template || !form.name.trim()) return;

    if (selectedWorkspaceId) {
      setActiveWorkspaceId(selectedWorkspaceId);
    }

    if (isPremium) {
      setIsCreating(true);
      try {
        const order = await createPurchase({
          source: 'site-builder',
          sourceItemId: template.id,
          siteName: form.name.trim(),
          itemName: template.name,
          itemDescription: template.description,
          itemThumbnail: template.thumbnail,
          priceEur: template.price!,
          priceAriary: template.priceAriary!,
        });
        onOpenChange(false);
        setForm({ name: '', description: '', lieu: '', objectif: '', probleme: '' });
        navigate(`/purchases/invoice/${order.id}`);
      } catch {
        toast.error('Erreur lors de la création de la commande');
      } finally {
        setIsCreating(false);
      }
      return;
    }

    setIsCreating(true);
    try {
      const site = await instantiateSite(template.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        lieu: form.lieu.trim() || undefined,
        objectif: form.objectif.trim() || undefined,
        probleme: form.probleme.trim() || undefined,
      });
      toast.success('Projet créé avec succès !', {
        description: `${site.name} est prêt à être édité.`
      });
      onOpenChange(false);
      setForm({ name: '', description: '', lieu: '', objectif: '', probleme: '' });
      navigate(`/site-builder/editor/${site.id}`);
    } catch {
      toast.error('Erreur lors de la création du projet');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            Créer un nouveau projet
            {isPremium && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Template : <strong>{template?.name}</strong>
            {isPremium && template?.price != null && (
              <span className="block mt-1 text-amber-600 font-medium">
                Prix : {template.price}€ / {template.priceAriary?.toLocaleString('fr-FR')} Ar
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Nom du projet */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name" className="font-semibold">
              Nom du projet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="proj-name"
              placeholder="Ex : Travelix Madagascar"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc" className="font-semibold">
              Description
            </Label>
            <Textarea
              id="proj-desc"
              placeholder="Décrivez votre projet en quelques phrases..."
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Lieu */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-lieu" className="font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Lieu
            </Label>
            <Input
              id="proj-lieu"
              placeholder="Ex : Antananarivo, Madagascar"
              value={form.lieu}
              onChange={e => handleChange('lieu', e.target.value)}
            />
          </div>

          {/* Objectif */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-objectif" className="font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-slate-400" />
              Objectif
            </Label>
            <Textarea
              id="proj-objectif"
              placeholder="Quel est l'objectif principal de ce projet ? Ex : attirer plus de touristes, vendre des circuits..."
              value={form.objectif}
              onChange={e => handleChange('objectif', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Problème */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-probleme" className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              Problème à résoudre
            </Label>
            <Textarea
              id="proj-probleme"
              placeholder="Quel problème cherchez-vous à résoudre ? Ex : manque de visibilité en ligne, pas de système de réservation..."
              value={form.probleme}
              onChange={e => handleChange('probleme', e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Workspace selector */}
          {workspaces.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="workspaceSelect" className="font-semibold">Workspace</Label>
              <select
                id="workspaceSelect"
                value={selectedWorkspaceId}
                onChange={e => setSelectedWorkspaceId(e.target.value)}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
          ) : workspaces.length === 1 ? (
            <div className="space-y-1.5">
              <Label className="font-semibold">Workspace</Label>
              <p className="text-sm text-muted-foreground font-medium">{workspaces[0].name}</p>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground bg-slate-50 rounded-md px-3 py-2">
            Ces informations serviront à personnaliser la génération automatique de contenu IA (blog, réseaux sociaux) pour ce projet.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!form.name.trim() || isCreating}>
            {isPremium ? (
              <>
                <Lock className="w-4 h-4 mr-1" />
                {isCreating ? 'Traitement...' : `Acheter et créer — ${template?.price}€ / ${template?.priceAriary?.toLocaleString('fr-FR')} Ar`}
              </>
            ) : (
              isCreating ? 'Création...' : 'Créer le projet'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
