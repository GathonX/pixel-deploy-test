import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Menu, TrendingUp, Calendar, Loader2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ✅ NOUVEAU : Imports des services backend
import { categoryService, Category } from "@/services/categoryService";
import { blogService } from "@/services/blogService";

interface BlogHeaderProps {
  currentCategory?: string;
  onSearch?: (query: string) => void;
  onCategoryChange?: (category: string | null) => void; // ✅ Callback pour changement catégorie
  className?: string;
  showFilters?: boolean; // ✅ Optionnel - afficher les filtres avancés
  showStats?: boolean; // ✅ Optionnel - afficher les statistiques
}

interface FilterState {
  search: string;
  category: string | null;
  sortBy: 'recent' | 'popular' | 'trending';
  timeRange: 'week' | 'month' | 'year' | 'all';
}

export function BlogHeader({ 
  currentCategory, 
  onSearch, 
  onCategoryChange,
  className,
  showFilters = true,
  showStats = false
}: BlogHeaderProps) {
  const navigate = useNavigate();

  // ✅ NOUVEAU : États pour les données backend
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularCategories, setPopularCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [blogStats, setBlogStats] = useState<{total_posts: number, total_views: number} | null>(null);

  // ✅ RECHERCHE EN TEMPS RÉEL : États pour la recherche avec debounce
  const [searchQuery, setSearchQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: currentCategory || null,
    sortBy: 'recent',
    timeRange: 'all'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ✅ RECHERCHE EN TEMPS RÉEL : Fonction de recherche avec debounce (500ms)
  const debouncedSearch = useCallback((query: string) => {
    // Annuler le timer précédent s'il existe
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Créer un nouveau timer
    const newTimer = setTimeout(() => {
      if (onSearch) {
        onSearch(query);
      }
      // Mettre à jour les filtres
      setFilters(prev => ({ ...prev, search: query }));
      
      // Afficher un message de feedback si la recherche n'est pas vide
      if (query.trim()) {
        console.log(`🔍 Recherche en cours: "${query}"`);
      }
    }, 500); // 500ms de délai

    setDebounceTimer(newTimer);
  }, [onSearch, debounceTimer]);

  // ✅ RECHERCHE EN TEMPS RÉEL : Gérer les changements de saisie
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    
    // Déclencher la recherche avec debounce
    debouncedSearch(newQuery.trim());
  };

  // ✅ RECHERCHE EN TEMPS RÉEL : Effacer la recherche
  const clearSearch = () => {
    setSearchQuery("");
    debouncedSearch(""); // Effacer la recherche immédiatement
  };

  // ✅ NOUVEAU : Charger les catégories depuis le backend
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        
        // Charger toutes les catégories blog
        const allCategories = await categoryService.getBlogCategories(true);
        setCategories(allCategories);

        // Charger les catégories populaires
        const popular = await categoryService.getPopularCategories(6);
        const blogPopular = popular.filter(cat => 
          allCategories.some(blogCat => blogCat.id === cat.id)
        );
        setPopularCategories(blogPopular);

        console.log(`✅ ${allCategories.length} catégories chargées pour le header`);

      } catch (error) {
        console.error('Erreur chargement catégories header:', error);
        // ✅ Fallback vers catégories par défaut
        setCategories([]);
        setPopularCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // ✅ NOUVEAU : Charger les statistiques du blog (optionnel)
  useEffect(() => {
    const loadBlogStats = async () => {
      if (!showStats) return;

      try {
        const stats = await blogService.getStatistics();
        setBlogStats({
          total_posts: stats.total_posts,
          total_views: stats.total_views
        });
      } catch (error) {
        console.error('Erreur chargement stats blog:', error);
        setBlogStats(null);
      }
    };

    if (showStats) {
      loadBlogStats();
    }
  }, [showStats]);

  // ✅ NOUVEAU : Synchroniser les filtres avec les props
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      category: currentCategory || null
    }));
  }, [currentCategory]);

  // ✅ RECHERCHE EN TEMPS RÉEL : Cleanup du timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // ✅ NOUVEAU : Changer de catégorie
  const handleCategoryChange = (categorySlug: string | null) => {
    setFilters(prev => ({ ...prev, category: categorySlug }));
    
    if (onCategoryChange) {
      onCategoryChange(categorySlug);
    } else {
      // Navigation directe
      if (categorySlug) {
        navigate(`/blog/category/${categorySlug}`);
      } else {
        navigate('/blog');
      }
    }
    
    setShowMobileMenu(false);
  };

  // ✅ NOUVEAU : Appliquer les filtres avancés
  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('q', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.sortBy !== 'recent') params.append('sort', filters.sortBy);
    if (filters.timeRange !== 'all') params.append('time', filters.timeRange);

    navigate(`/blog?${params.toString()}`);
    setShowAdvancedFilters(false);
    toast.success("Filtres appliqués");
  };

  // ✅ NOUVEAU : Réinitialiser les filtres
  const handleResetFilters = () => {
    setFilters({
      search: "",
      category: null,
      sortBy: 'recent',
      timeRange: 'all'
    });
    setSearchQuery("");
    setShowAdvancedFilters(false);
    
    if (onCategoryChange) {
      onCategoryChange(null);
    } else {
      navigate('/blog');
    }
  };

  // ✅ NOUVEAU : Obtenir le nombre de filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category) count++;
    if (filters.sortBy !== 'recent') count++;
    if (filters.timeRange !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className={cn("w-full bg-white border-b sticky top-0 z-10 shadow-sm", className)}>
      <div className="container mx-auto px-4 py-4">
        {/* ✅ NOUVEAU : Header principal avec statistiques optionnelles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Actualité</h1>
              {showStats && blogStats && (
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {blogStats.total_posts} articles
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {blogStats.total_views.toLocaleString()} vues
                  </Badge>
                </div>
              )}
            </div>

            {/* ✅ NOUVEAU : Navigation desktop avec catégories backend */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink 
                    className={navigationMenuTriggerStyle({
                      className: currentCategory === undefined ? "bg-accent" : ""
                    })}
                    onClick={() => handleCategoryChange(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    Tous
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* ✅ Catégories populaires dynamiques */}
                {!loadingCategories && popularCategories.slice(0, 4).map((category) => (
                  <NavigationMenuItem key={category.id}>
                    <NavigationMenuLink 
                      className={navigationMenuTriggerStyle({
                        className: currentCategory === category.slug ? "bg-accent" : ""
                      })}
                      onClick={() => handleCategoryChange(category.slug)}
                      style={{ cursor: 'pointer' }}
                    >
                      {category.name}
                      {category.blog_posts_count !== undefined && (
                        <span className="ml-1 text-xs opacity-60">
                          ({category.blog_posts_count})
                        </span>
                      )}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}

                {/* ✅ Loading state pour la navigation */}
                {loadingCategories && (
                  <NavigationMenuItem>
                    <div className="flex items-center gap-2 px-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Chargement...</span>
                    </div>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          
          {/* ✅ RECHERCHE EN TEMPS RÉEL : Nouvelle barre de recherche */}
          <div className="flex items-center gap-2">
            {/* Recherche en temps réel */}
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Rechercher un article..."
                className="pl-8 w-full md:w-[300px]"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {/* ✅ Indicateur de recherche active */}
              {searchQuery && (
                <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
                  🔍 Recherche: "{searchQuery}"
                </div>
              )}
            </div>

            {/* ✅ NOUVEAU : Filtres avancés */}
            {showFilters && (
              <DropdownMenu open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <DropdownMenuTrigger asChild>
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
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Filtres avancés</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Catégorie */}
                  <div className="p-2">
                    <label className="text-sm font-medium mb-2 block">Catégorie</label>
                    <select 
                      value={filters.category || ""} 
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || null }))}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="">Toutes les catégories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name} ({cat.blog_posts_count || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tri */}
                  <div className="p-2">
                    <label className="text-sm font-medium mb-2 block">Trier par</label>
                    <select 
                      value={filters.sortBy} 
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="recent">Plus récents</option>
                      <option value="popular">Plus populaires</option>
                      <option value="trending">Tendances</option>
                    </select>
                  </div>

                  {/* Période */}
                  <div className="p-2">
                    <label className="text-sm font-medium mb-2 block">Période</label>
                    <select 
                      value={filters.timeRange} 
                      onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
                      className="w-full p-2 border rounded text-sm"
                    >
                      <option value="all">Toute période</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                      <option value="year">Cette année</option>
                    </select>
                  </div>

                  <DropdownMenuSeparator />
                  
                  {/* Actions */}
                  <div className="p-2 flex gap-2">
                    <Button size="sm" onClick={handleApplyFilters} className="flex-1">
                      Appliquer
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleResetFilters}>
                      Reset
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* ✅ NOUVEAU : Menu mobile */}
            <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  {/* Toutes les catégories */}
                  <Button
                    variant={currentCategory === undefined ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleCategoryChange(null)}
                  >
                    Tous les articles
                  </Button>

                  {/* Catégories */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Catégories</h4>
                    {loadingCategories ? (
                      <div className="flex items-center gap-2 p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Chargement...</span>
                      </div>
                    ) : (
                      categories.map((category) => (
                        <Button
                          key={category.id}
                          variant={currentCategory === category.slug ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleCategoryChange(category.slug)}
                        >
                          <Hash className="h-4 w-4 mr-2" />
                          {category.name}
                          <span className="ml-auto text-xs opacity-60">
                            {category.blog_posts_count || 0}
                          </span>
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* ✅ NOUVEAU : Indicateur de filtres actifs */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Filtres actifs :</span>
            {filters.search && (
              <Badge variant="secondary" className="text-xs">
                "{filters.search}"
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary" className="text-xs">
                {categories.find(c => c.slug === filters.category)?.name || filters.category}
              </Badge>
            )}
            {filters.sortBy !== 'recent' && (
              <Badge variant="secondary" className="text-xs">
                {filters.sortBy === 'popular' ? 'Populaires' : 'Tendances'}
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetFilters}
              className="text-xs h-6 px-2"
            >
              Tout effacer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}