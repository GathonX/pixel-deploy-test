import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Globe,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { searchDomains, sanitizeDomainName, isValidDomainName, DomainSearchResult } from "@/services/studioDomainService";
import { useToast } from "@/hooks/use-toast";
import { euroToAriary, formatAriary } from "@/utils/currency";

interface DomainResult {
  domain: string;
  available: boolean;
  extension: string;
  price?: string | number;
  price_monthly?: string | number;
  price_category?: string;
  currency?: string;
  error?: string;
}

const EXTENSION_CATEGORIES: Record<string, string[]> = {
  "Populaires": [
    ".com", ".net", ".org", ".fr", ".io", ".co", ".eu", ".info", ".biz", ".me",
    ".name", ".pro", ".mobi", ".tel",
  ],
  "Tech & Digital": [
    ".app", ".dev", ".tech", ".digital", ".cloud", ".software", ".systems",
    ".network", ".online", ".site", ".host", ".ai", ".tools", ".codes", ".email",
    ".web", ".data", ".api", ".code", ".computer", ".domains", ".download",
    ".hosting", ".link", ".page", ".server", ".storage", ".stream", ".website",
  ],
  "Business": [
    ".business", ".company", ".group", ".agency", ".consulting", ".solutions",
    ".services", ".store", ".shop", ".market", ".markets", ".finance", ".capital",
    ".trade", ".pro", ".expert", ".guru", ".management", ".enterprises", ".partners",
    ".ventures", ".works", ".directory", ".exchange", ".holdings", ".industries",
    ".international", ".ltd", ".network", ".sale", ".supply", ".tax", ".tips",
  ],
  "Médias & Création": [
    ".media", ".studio", ".design", ".art", ".photo", ".photography", ".video",
    ".music", ".blog", ".news", ".press", ".social", ".live", ".stream", ".gallery",
    ".tv", ".fm", ".band", ".camera", ".film", ".graphics", ".ink", ".movie",
    ".pictures", ".productions", ".radio", ".show", ".theater", ".wiki",
  ],
  "E-commerce": [
    ".shop", ".store", ".market", ".boutique", ".deals", ".sale", ".promo",
    ".discount", ".buy", ".auction", ".bid", ".cart", ".cash", ".cheap",
    ".coupon", ".gift", ".luxury", ".mall", ".pay", ".payments", ".price",
    ".shopping", ".style",
  ],
  "Hôtellerie & Voyage": [
    ".travel", ".hotel", ".restaurant", ".bar", ".cafe", ".coffee", ".food",
    ".wine", ".beer", ".events", ".party", ".wedding", ".tickets", ".flights",
    ".tours", ".holiday", ".vacations", ".villas", ".cruise", ".directory",
    ".guide", ".menu", ".rentals", ".resort", ".taxi", ".tours", ".trip",
  ],
  "Mode & Lifestyle": [
    ".fashion", ".clothing", ".shoes", ".jewelry", ".accessories", ".beauty",
    ".spa", ".salon", ".fitness", ".yoga", ".sport", ".life", ".love", ".fun",
    ".cool", ".sexy", ".style", ".tattoo", ".cosmetics", ".diet", ".gym",
    ".hair", ".makeup", ".nails", ".piercing",
  ],
  "Santé": [
    ".health", ".healthcare", ".medical", ".clinic", ".dental", ".care",
    ".pharmacy", ".bio", ".doctor", ".hospital", ".surgery", ".therapy",
    ".vision", ".diet", ".fitness", ".yoga",
  ],
  "Immobilier": [
    ".estate", ".properties", ".house", ".home", ".realty", ".apartments",
    ".construction", ".build", ".builders", ".archi", ".architect", ".architect",
    ".cleaning", ".contractors", ".flooring", ".glass", ".kitchen", ".lighting",
    ".ltd", ".mortgage", ".plumbing", ".repair", ".solar", ".tools",
  ],
  "Éducation": [
    ".education", ".school", ".academy", ".training", ".coach", ".science",
    ".institute", ".foundation", ".courses", ".college", ".university", ".study",
    ".camp", ".center", ".degree", ".gratis", ".institute", ".mba", ".phd",
  ],
  "Communauté & Fun": [
    ".community", ".club", ".world", ".global", ".zone", ".today", ".plus",
    ".best", ".top", ".one", ".now", ".rocks", ".lol", ".wtf", ".ninja",
    ".guru", ".adult", ".dating", ".chat", ".family", ".kids", ".singles",
    ".social", ".vote", ".voto",
  ],
  "Europe": [
    ".fr", ".de", ".es", ".it", ".nl", ".be", ".ch", ".at", ".pl", ".pt",
    ".cz", ".se", ".no", ".dk", ".fi", ".hu", ".ro", ".gr", ".bg", ".lu",
    ".ie", ".lt", ".lv", ".ee", ".is", ".hr", ".sk", ".si", ".cy", ".mt",
    ".uk", ".scot", ".wales",
  ],
  "International": [
    ".us", ".ca", ".au", ".nz", ".sg", ".hk", ".in", ".jp", ".ae", ".sa",
    ".za", ".br", ".mx", ".ar", ".ma", ".re", ".ng", ".ke", ".gh", ".tz",
    ".tr", ".eg", ".il", ".pk", ".bd", ".vn", ".ph", ".id", ".my", ".th",
    ".kz", ".ua", ".by", ".az", ".ge", ".am", ".mn", ".tw",
  ],
};

const DomainSearch = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterExtension, setFilterExtension] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DomainResult[] | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Populaires"]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const searchExtensions = useMemo(() => {
    const exts = new Set<string>();
    selectedCategories.forEach(cat => {
      (EXTENSION_CATEGORIES[cat] || []).forEach(e => exts.add(e));
    });
    return Array.from(exts);
  }, [selectedCategories]);

  const totalExtensions = useMemo(() => {
    const exts = new Set<string>();
    Object.values(EXTENSION_CATEGORIES).forEach(list => list.forEach(e => exts.add(e)));
    return exts.size;
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    if (searchExtensions.length === 0) {
      toast({ title: "Sélectionnez au moins une catégorie", variant: "destructive" });
      return;
    }

    const cleanedName = sanitizeDomainName(searchTerm);

    if (!isValidDomainName(cleanedName)) {
      toast({
        title: "Nom invalide",
        description: "Le nom de domaine contient des caractères non autorisés.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setResults(null);
    setFilterExtension("all");

    try {
      const response = await searchDomains(cleanedName, searchExtensions);

      if (response.success && response.results) {
        const domainResults: DomainResult[] = response.results.map((result: DomainSearchResult) => ({
          domain: result.domain,
          available: result.available,
          extension: result.extension,
          price: result.price,
          price_monthly: result.price_monthly,
          price_category: result.price_category,
          currency: result.currency || 'EUR',
          error: result.error,
        }));
        setResults(domainResults);
      } else {
        toast({
          title: "Erreur de recherche",
          description: response.error || "Impossible de vérifier la disponibilité.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Domain search error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de contacter le service de vérification.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const filteredResults = results
    ? filterExtension === "all"
      ? results
      : results.filter((r) => r.extension === filterExtension)
    : null;

  const availableCount = results ? results.filter((r) => r.available).length : 0;

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-cta-section py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white">
              Recherchez votre nom de domaine
            </h1>
            <p className="text-white/80 text-lg">
              Vérifiez la disponibilité sur plus de {totalExtensions} extensions — choisissez vos catégories
            </p>

            {/* Search Box */}
            <div className="bg-white rounded-2xl p-3 shadow-xl flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-4">
                <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Entrez votre nom de domaine (ex: monsite)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground/60"
                />
              </div>

              <Button
                variant="default"
                size="lg"
                onClick={handleSearch}
                disabled={isSearching || !searchTerm.trim() || searchExtensions.length === 0}
                className="min-w-[160px] bg-blue-600 hover:bg-blue-700"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Rechercher ({searchExtensions.length})
                  </>
                )}
              </Button>
            </div>

            {/* Category picker */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left space-y-3">
              <button
                className="w-full flex items-center justify-between text-white font-medium text-sm"
                onClick={() => setShowCategoryPicker(v => !v)}
              >
                <span>Catégories sélectionnées : {selectedCategories.length > 0 ? selectedCategories.join(", ") : "aucune"}</span>
                {showCategoryPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showCategoryPicker && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(EXTENSION_CATEGORIES).map(([cat, exts]) => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                          selectedCategories.includes(cat)
                            ? "bg-white text-blue-700 border-white"
                            : "bg-white/10 text-white border-white/30 hover:bg-white/20"
                        }`}
                      >
                        {cat} <span className="opacity-70">({exts.length})</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setSelectedCategories(Object.keys(EXTENSION_CATEGORIES))}
                      className="text-xs text-white/70 hover:text-white underline"
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-white/40">·</span>
                    <button
                      onClick={() => setSelectedCategories(["Populaires"])}
                      className="text-xs text-white/70 hover:text-white underline"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          {results ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold mb-3">
                  Résultats pour "{searchTerm}"
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-sm bg-warning/10 text-warning px-4 py-2 rounded-full">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Disponibilité indicative, non garantie.</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm px-4 py-2 rounded-full bg-success/10 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <strong>{availableCount}</strong>&nbsp;disponible{availableCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Filter by extension */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground mr-1">Filtrer :</span>
                <button
                  onClick={() => setFilterExtension("all")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterExtension === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Toutes ({results.length})
                </button>
                {results.map((result) => (
                    <button
                      key={result.extension}
                      onClick={() => setFilterExtension(filterExtension === result.extension ? "all" : result.extension)}
                      className={`px-3 py-1 rounded-full text-xs font-mono font-medium transition-colors ${
                        filterExtension === result.extension
                          ? "bg-primary text-primary-foreground"
                          : result.available
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {result.extension}
                    </button>
                  ))}
              </div>

              {/* Results list */}
              <div className="space-y-3">
                {(filteredResults || []).map((result) => (
                  <div
                    key={result.domain}
                    className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                      result.available
                        ? "bg-success/5 border-success/30 hover:border-success/50"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {result.available ? (
                        <div className="p-2 rounded-full bg-success/20">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-destructive/20">
                          <XCircle className="h-5 w-5 text-destructive" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-lg">{result.domain}</div>
                        <div className={`text-sm ${result.available ? "text-success" : "text-muted-foreground"}`}>
                          {result.available ? "Disponible" : "Indisponible"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {result.available && result.price_monthly && Number(result.price_monthly) > 0 && (
                        <div className="text-right">
                          <div className="font-bold text-lg text-foreground">
                            {Number(result.price_monthly).toFixed(2)} €
                            <span className="text-sm font-normal text-muted-foreground">/mois</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            soit {formatAriary(euroToAriary(Number(result.price_monthly)))} Ar/mois
                          </div>
                        </div>
                      )}
                      {result.available && (
                        <Link to={`/studio-domaine/request?domain=${encodeURIComponent(result.domain)}&price=${result.price ?? 0}&currency=${result.currency || 'EUR'}`}>
                          <Button variant="default" size="sm" className="group bg-green-600 hover:bg-green-700">
                            Continuer
                            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {filteredResults && filteredResults.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun résultat pour cette extension.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="p-6 rounded-2xl bg-muted/50">
                <Globe className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-display text-xl font-semibold mb-2">
                  Recherchez votre nom de domaine
                </h3>
                <p className="text-muted-foreground">
                  Entrez le nom souhaité ci-dessus pour vérifier sa disponibilité
                  sur plus de {totalExtensions} extensions différentes.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-card border border-border">
                <Search className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-display font-semibold mb-2">Recherche uniquement</h3>
                <p className="text-sm text-muted-foreground">Cette page vérifie la disponibilité. Aucun enregistrement automatique.</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border">
                <AlertCircle className="h-8 w-8 text-warning mb-4" />
                <h3 className="font-display font-semibold mb-2">Non garanti</h3>
                <p className="text-sm text-muted-foreground">La disponibilité affichée est indicative et peut changer.</p>
              </div>
              <div className="p-6 rounded-xl bg-card border border-border">
                <CheckCircle className="h-8 w-8 text-success mb-4" />
                <h3 className="font-display font-semibold mb-2">Validation manuelle</h3>
                <p className="text-sm text-muted-foreground">Chaque domaine est vérifié et enregistré manuellement par notre équipe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default DomainSearch;
