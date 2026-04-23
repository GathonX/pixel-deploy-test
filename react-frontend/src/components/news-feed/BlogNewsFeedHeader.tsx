import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BlogNewsFeedHeaderProps {
  onSearch: (query: string) => void;
  onFilterClick?: () => void;
}

export function BlogNewsFeedHeader({ onSearch, onFilterClick }: BlogNewsFeedHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    onSearch("");
  };
  return (
    <div className="space-y-6">
      {/* ✅ Header principal avec recherche moderne */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Barre de recherche moderne */}
          <div className="relative flex-1 group">
            <div className={`relative transition-all duration-200 ${
              isSearchFocused ? 'transform scale-[1.02]' : ''
            }`}>
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                isSearchFocused ? 'text-brand-blue h-5 w-5' : 'text-slate-400 h-4 w-4'
              }`} />
              
              <Input
                type="text"
                placeholder="Rechercher des articles, auteurs, sujets..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`pl-12 pr-12 h-12 text-base border-0 shadow-lg bg-white/80 backdrop-blur-sm transition-all duration-200 ${
                  isSearchFocused 
                    ? 'ring-2 ring-brand-blue/20 shadow-xl bg-white' 
                    : 'hover:shadow-xl hover:bg-white/90'
                }`}
              />
              
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </Button>
              )}
              
              {/* Effet de glow au focus */}
              {isSearchFocused && (
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand-blue/5 to-indigo-600/5 -z-10 animate-pulse"></div>
              )}
            </div>
          </div>

          {/* Bouton Filtres avancés */}
          <Button
            variant="outline"
            size="default"
            onClick={onFilterClick}
            className="h-12 px-4 bg-white/80 backdrop-blur-sm border-slate-200/50 hover:bg-white hover:shadow-lg transition-all duration-200 group"
          >
            <Filter className="h-4 w-4 mr-2 group-hover:text-brand-blue transition-colors" />
            <span className="hidden sm:inline">Filtres avancés</span>
          </Button>
        </div>


        {/* ✅ Résultats de recherche */}
        {searchQuery && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-200/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-brand-blue" />
                <span className="text-sm text-slate-700">
                  Recherche : <span className="font-semibold text-brand-blue">"{searchQuery}"</span>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="text-slate-500 hover:text-slate-700 text-xs"
              >
                Effacer
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}