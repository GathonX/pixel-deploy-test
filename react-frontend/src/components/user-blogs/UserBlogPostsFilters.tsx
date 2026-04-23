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
import { categoryService, Category } from "@/services/categoryService";

// ✅ CORRECTION CRITIQUE : Interface mise à jour avec categories optionnel
interface UserBlogPostsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories?: Array<{                     // ✅ CORRECTION : categories optionnel
    value: string;
    label: string;
  }>;
  onFiltersChange?: () => void;
  showAdvancedFilters?: boolean;
}

export function UserBlogPostsFilters({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  categories = [],                        // ✅ CORRECTION : Valeur par défaut
  onFiltersChange,
  showAdvancedFilters = true
}: UserBlogPostsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ✅ NOUVEAU : Notifier les changements de filtres
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange();
    }
  }, [searchQuery, selectedStatus, selectedCategory, onFiltersChange]);

  // ✅ NOUVEAU : Réinitialiser tous les filtres
  const clearAllFilters = () => {
    onSearchChange("");
    onStatusChange("all");
    onCategoryChange("all");
  };

  // ✅ NOUVEAU : Compter les filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedStatus !== "all") count++;
    if (selectedCategory !== "all") count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // ✅ NOUVEAU : Obtenir le nom de la catégorie sélectionnée
  const getSelectedCategoryName = () => {
    if (selectedCategory === "all") return null;
    const option = categories?.find(opt => opt.value === selectedCategory); // ✅ CORRECTION : Optional chaining
    return option?.label || selectedCategory;
  };

  return (
    <div className="space-y-3 my-4">
      {/* ✅ Ligne principale de filtres */}
      <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
        {/* ✅ CORRECTION : Champ de recherche avec bon nom de prop */}
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8 w-full md:w-[200px]"
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

        {/* ✅ CORRECTION : Select statut avec bon nom de prop */}
        <Select 
          value={selectedStatus}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="published">Publiés</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="scheduled">Programmés</SelectItem>
          </SelectContent>
        </Select>

        {/* ✅ CORRECTION : Select catégorie avec vérification categories */}
        <Select 
          value={selectedCategory}
          onValueChange={onCategoryChange}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories && categories.map((option) => (  // ✅ CORRECTION : Vérification avant map
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* ✅ Bouton filtres avancés */}
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
                
                {/* ✅ Résumé des filtres actifs */}
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
                          Statut : {selectedStatus}
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
                      {selectedCategory !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          Catégorie : {getSelectedCategoryName()}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => onCategoryChange("all")}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* ✅ Raccourcis de filtres populaires */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Raccourcis :</span>
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

                {/* ✅ Catégories populaires avec vérification */}
                {categories && categories.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Catégories populaires :</span>
                    <div className="flex flex-wrap gap-1">
                      {categories.filter(cat => cat.value !== 'all').slice(0, 5).map((category) => (
                        <Button 
                          key={category.value}
                          variant="outline" 
                          size="sm" 
                          onClick={() => onCategoryChange(category.value)}
                          className="text-xs"
                        >
                          {category.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* ✅ Indicateur de filtres actifs */}
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
              {selectedStatus}
            </Badge>
          )}
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {getSelectedCategoryName()}
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