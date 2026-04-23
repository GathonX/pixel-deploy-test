import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle, Globe, Loader2, ExternalLink, Copy, Check, ShoppingCart, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName: string;
  siteId: string;
  isPublished: boolean;
  previewUrl: string;
  hasActiveDomain: boolean;
  activeDomain?: string;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function PublishDialog({
  open,
  onOpenChange,
  siteId,
  isPublished,
  previewUrl,
  hasActiveDomain,
  activeDomain,
  onPublish,
  onUnpublish,
}: PublishDialogProps) {
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onPublish();
    setIsPublishing(false);
    onOpenChange(false);
  };

  const handleUnpublish = async () => {
    setIsPublishing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onUnpublish();
    setIsPublishing(false);
    onOpenChange(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    toast.success('URL copiée !');
    setTimeout(() => setCopied(false), 2000);
  };

  const goTo = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {isPublished ? 'Gérer la publication' : 'Publier votre site'}
          </DialogTitle>
          <DialogDescription>
            {isPublished
              ? 'Votre site est en ligne et accessible publiquement.'
              : 'Votre site sera publié et accessible via le lien de prévisualisation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isPublished ? (
            <>
              {/* Lien de prévisualisation */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Site en ligne</span>
                </div>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline text-xs break-all block font-mono"
                >
                  {previewUrl}
                </a>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(previewUrl, '_blank')}>
                    <ExternalLink className="w-3 h-3 mr-1.5" />Visiter
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopyUrl}>
                    {copied ? <Check className="w-3 h-3 mr-1.5" /> : <Copy className="w-3 h-3 mr-1.5" />}
                    Copier
                  </Button>
                </div>
              </div>

              {/* Domaine personnalisé — actif */}
              {hasActiveDomain && activeDomain && (
                <div className="border border-primary/20 bg-primary/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Domaine personnalisé actif</span>
                  </div>
                  <a
                    href={`https://${activeDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs font-mono break-all block"
                  >
                    https://{activeDomain}
                  </a>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => goTo(`/site-builder/domains/${siteId}`)}
                  >
                    <Settings className="w-3 h-3 mr-1.5" />Gérer les domaines
                  </Button>
                </div>
              )}

              {/* Domaine personnalisé — pas encore configuré */}
              {!hasActiveDomain && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Donnez une adresse professionnelle à votre site</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Remplacez le lien de prévisualisation par votre propre nom de domaine (ex&nbsp;: monhotel.com) avec SSL inclus.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => goTo('/studio-domaine/search')}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1.5" />Acheter un domaine
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => goTo(`/site-builder/domains/${siteId}`)}
                    >
                      <Globe className="w-3 h-3 mr-1.5" />J'ai déjà un domaine
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">Ce qui va se passer :</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                  Votre site sera accessible via votre lien de prévisualisation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                  Vous pourrez connecter votre propre domaine avec SSL automatique
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                  Indexation par les moteurs de recherche
                </li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isPublished ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <Button variant="destructive" onClick={handleUnpublish} disabled={isPublishing}>
                {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Dépublier
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                Publier
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
