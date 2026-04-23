import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Facebook, Instagram, Linkedin, Twitter, AlertCircle } from 'lucide-react';
import api from '@/services/api';

interface Platform {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

const PLATFORMS: Platform[] = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'text-sky-500' },
];

interface SocialPlatformSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (platforms: string[]) => void;
}

export const SocialPlatformSelector: React.FC<SocialPlatformSelectorProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Charger les plateformes déjà sélectionnées
  useEffect(() => {
    if (open) {
      loadExistingPlatforms();
    }
  }, [open]);

  const loadExistingPlatforms = async () => {
    try {
      setLoadingExisting(true);
      const response = await api.get('/features/social-platforms');
      
      if (response.data.success && response.data.data.platforms) {
        // Si des plateformes sont déjà sauvegardées, les charger
        setSelectedPlatforms(response.data.data.platforms);
      } else {
        // ✅ CORRECTION : Par défaut, AUCUNE plateforme sélectionnée
        // L'utilisateur doit faire un choix actif
        setSelectedPlatforms([]);
      }
    } catch (error) {
      console.error('Erreur chargement plateformes:', error);
      // ✅ CORRECTION : En cas d'erreur, aucune plateforme par défaut
      setSelectedPlatforms([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleConfirm = async () => {
    if (selectedPlatforms.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // Sauvegarder les plateformes sélectionnées
      await api.post('/features/social-platforms', {
        platforms: selectedPlatforms,
      });

      // Confirmer et fermer
      onConfirm(selectedPlatforms);
    } catch (error) {
      console.error('Erreur sauvegarde plateformes:', error);
      // Continuer quand même
      onConfirm(selectedPlatforms);
    } finally {
      setLoading(false);
    }
  };

  const getPostsCount = () => {
    const dayOfWeek = new Date().getDay();
    const postsPerDay: Record<number, number> = {
      0: 1, // Dimanche
      1: 7, // Lundi
      2: 6, // Mardi
      3: 5, // Mercredi
      4: 4, // Jeudi
      5: 3, // Vendredi
      6: 2, // Samedi
    };
    return postsPerDay[dayOfWeek] || 1;
  };

  const totalPosts = selectedPlatforms.length * getPostsCount();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Sélectionnez vos réseaux sociaux
          </DialogTitle>
          <DialogDescription>
            Choisissez les plateformes sur lesquelles vous souhaitez publier automatiquement.
            Vous devez sélectionner au moins une plateforme.
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="py-8 text-center text-gray-500">
            Chargement...
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);

                return (
                  <div
                    key={platform.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                  >
                    <Checkbox
                      id={platform.id}
                      checked={isSelected}
                      onCheckedChange={() => togglePlatform(platform.id)}
                    />
                    <Icon className={`h-6 w-6 ${platform.color}`} />
                    <Label
                      htmlFor={platform.id}
                      className="flex-1 cursor-pointer font-medium"
                    >
                      {platform.name}
                    </Label>
                    {isSelected && (
                      <span className="text-sm text-primary font-semibold">
                        {getPostsCount()} posts
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedPlatforms.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Veuillez sélectionner au moins une plateforme
                </AlertDescription>
              </Alert>
            )}

            {selectedPlatforms.length > 0 && (
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>{totalPosts} posts</strong> seront générés au total
                  ({getPostsCount()} posts × {selectedPlatforms.length} plateforme
                  {selectedPlatforms.length > 1 ? 's' : ''})
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedPlatforms.length === 0 || loading || loadingExisting}
          >
            {loading ? 'Activation...' : 'Activer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
