import React, { useState, useEffect } from "react";
import { Search, Filter, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SocialMediaFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedPlatform: string;
  onPlatformChange: (value: string) => void;
  platforms?: Array<{
    value: string;
    label: string;
  }>;
  onFiltersChange?: () => void;
  showAdvancedFilters?: boolean;
}

export function SocialMediaFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedPlatform,
  onPlatformChange,
  platforms = [],
  onFiltersChange,
  showAdvancedFilters = true
}: SocialMediaFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Notifier les changements de filtres
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange();
    }
  }, [searchQuery, selectedStatus, selectedPlatform, onFiltersChange]);

  // Réinitialiser tous les filtres
  const clearAllFilters = () => {
    onSearchChange("");
    onStatusChange("all");
    onPlatformChange("all");
  };

  // Compter les filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedStatus !== "all") count++;
    if (selectedPlatform !== "all") count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Obtenir le nom de la plateforme sélectionnée
  const getSelectedPlatformName = () => {
    if (selectedPlatform === "all") return null;
    const platform = platforms?.find(opt => opt.value === selectedPlatform);
    return platform?.label || selectedPlatform;
  };

  // Obtenir le statut formaté
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      all: "Tous les statuts",
      published: "Publiés",
      draft: "Brouillons",
      scheduled: "Programmés"
    };
    return statusLabels[status] || status;
  };

  return (
    <div className="space-y-3">
      {/* Ligne principale de filtres */}
      <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
        {/* Champ de recherche */}
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les posts..."
            className="pl-8 w-full md:w-[250px]"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-6 w-6 p-0"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Select statut */}
        <Select 
          value={selectedStatus}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="published">Publiés</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="scheduled">Programmés</SelectItem>
          </SelectContent>
        </Select>

        {/* Select plateforme */}
        <Select 
          value={selectedPlatform}
          onValueChange={onPlatformChange}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Plateforme" />
          </SelectTrigger>
          <SelectContent>
            {platforms && platforms.map((platform) => (
              <SelectItem key={platform.value} value={platform.value}>
                {platform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bouton filtres avancés */}
        {showAdvancedFilters && (
          <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium">Filtres avancés</h4>
                
                {/* Résumé des filtres actifs */}
                {activeFiltersCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Filtres actifs :</span>
                      <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                        Tout effacer
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {searchQuery && (
                        <Badge variant="secondary" className="text-xs">
                          Recherche : "{searchQuery}"
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => onSearchChange("")}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      )}
                      {selectedStatus !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Statut : {getStatusLabel(selectedStatus)}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => onStatusChange("all")}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      )}
                      {selectedPlatform !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Plateforme : {getSelectedPlatformName()}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => onPlatformChange("all")}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Raccourcis de filtres populaires */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Raccourcis statuts :</span>
                  <div className="flex flex-wrap gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onStatusChange("draft")}
                      className="text-xs"
                    >
                      Mes brouillons
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onStatusChange("published")}
                      className="text-xs"
                    >
                      Publiés
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onStatusChange("scheduled")}
                      className="text-xs"
                    >
                      Programmés
                    </Button>
                  </div>
                </div>

                {/* Plateformes populaires */}
                {platforms && platforms.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Raccourcis plateformes :</span>
                    <div className="flex flex-wrap gap-1">
                      {platforms.filter(platform => platform.value !== 'all').slice(0, 5).map((platform) => (
                        <Button 
                          key={platform.value}
                          variant="outline" 
                          size="sm" 
                          onClick={() => onPlatformChange(platform.value)}
                          className="text-xs"
                        >
                          {platform.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions rapides */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Actions rapides :</span>
                  <div className="flex flex-wrap gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        onStatusChange("published");
                        onPlatformChange("facebook");
                      }}
                      className="text-xs"
                    >
                      Facebook publiés
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        onStatusChange("draft");
                        onPlatformChange("all");
                      }}
                      className="text-xs"
                    >
                      Tous les brouillons
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Indicateur de filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Filtres actifs :</span>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs">
              "{searchQuery}"
            </Badge>
          )}
          {selectedStatus !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {getStatusLabel(selectedStatus)}
            </Badge>
          )}
          {selectedPlatform !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {getSelectedPlatformName()}
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-xs h-6 px-2"
          >
            Effacer tout
          </Button>
        </div>
      )}
    </div>
  );
}