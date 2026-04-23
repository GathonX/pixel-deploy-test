import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
interface BlogWebsite { id?: string; name?: string; url?: string; [key: string]: unknown; }

interface SocialMediaHeaderProps {
  defaultWebsite: BlogWebsite | null;
  onGeneratePost: () => void;
  isGenerating: boolean;
}

export const SocialMediaHeader: React.FC<SocialMediaHeaderProps> = ({
  defaultWebsite,
  onGeneratePost,
  isGenerating
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">Réseaux sociaux par défaut</h1>
          <p className="text-muted-foreground">
            Gérez vos publications sur les différents réseaux sociaux et programmez votre contenu.
          </p>
        </div>
        
        <Button 
          onClick={onGeneratePost}
          disabled={isGenerating || !defaultWebsite}
          className="flex items-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isGenerating ? "Génération..." : "Générer un post"}
        </Button>
      </div>
      
      {defaultWebsite ? (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-medium text-green-800">Profil par défaut: {defaultWebsite.title}</h2>
              <p className="text-sm text-green-600">
                Ce profil sera utilisé par défaut pour la publication sur les réseaux sociaux.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-medium text-amber-800">Aucun profil par défaut</h2>
              <p className="text-sm text-amber-600">
                Veuillez définir un profil par défaut pour générer des posts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};