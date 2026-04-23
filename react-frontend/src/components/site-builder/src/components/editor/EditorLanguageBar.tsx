import { useState } from 'react';
import { Globe, Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { usePlatform } from '../../contexts/PlatformContext';
import { luxiosLangStore } from './sections/luxios/luxiosLangStore';

interface Props {
  siteId: string;
}

export function EditorLanguageBar({ siteId }: Props) {
  const { siteLangs, activeLang, setActiveLang, translateSite } = usePlatform() as any;
  const [translating, setTranslating] = useState<string | null>(null); // lang code being translated
  const [translated, setTranslated] = useState<string | null>(null);   // lang code just translated

  if (!siteLangs || siteLangs.length === 0) return null;

  const handleSwitch = async (lang: { code: string; name: string; flag: string; isDefault: boolean }) => {
    if (lang.code === activeLang) return;

    // Vérifier si des traductions existent dans les sections en mémoire
    // On lance la traduction si la langue n'est pas la langue par défaut et qu'aucune section
    // n'a encore de traduction pour cette langue
    const needsTranslation = !lang.isDefault && !hasTranslations(lang.code);

    if (needsTranslation) {
      setTranslating(lang.code);
      const result = await translateSite(siteId, lang.code, lang.name);
      setTranslating(null);

      if (!result.success) {
        alert(`Erreur : ${result.message}`);
        return;
      }

      setTranslated(lang.code);
      setTimeout(() => setTranslated(null), 3000);
    }

    setActiveLang(lang.code);
    luxiosLangStore.set(lang.code);
  };

  // Vérifie si la langue a déjà des traductions (en regardant le store)
  // On utilise un proxy simple : si la langue n'est pas la langue par défaut,
  // on assume que si l'utilisateur a déjà fait une traduction elle existe.
  // La vraie vérification se fait côté serveur.
  const hasTranslations = (langCode: string): boolean => {
    // On ne peut pas savoir facilement depuis le store si les traductions existent
    // sans fetch supplémentaire — on laisse le backend gérer (il écrase)
    // Pour UX : on retourne false pour toujours proposer de retraduire si besoin
    // mais on peut optimiser plus tard
    return false;
  };

  const defaultLang = siteLangs.find((l: any) => l.isDefault);

  return (
    <div className="border-t bg-card px-3 py-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Langue du site</span>
      </div>

      {/* Language buttons */}
      <div className="flex flex-col gap-1">
        {siteLangs.map((lang: any) => {
          const isActive   = lang.code === activeLang;
          const isDefault  = lang.isDefault;
          const isLoading  = translating === lang.code;
          const justDone   = translated === lang.code;

          return (
            <button
              key={lang.code}
              onClick={() => handleSwitch(lang)}
              disabled={!!translating}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left w-full',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-muted text-foreground',
                translating && !isLoading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {/* Flag */}
              <span className="text-base leading-none">{lang.flag}</span>

              {/* Name */}
              <span className="flex-1 truncate">{lang.name}</span>

              {/* Status badges */}
              {isDefault && !isActive && (
                <span className="text-[10px] text-muted-foreground border rounded px-1 py-0.5 leading-none">
                  défaut
                </span>
              )}
              {!isDefault && !isActive && !isLoading && !justDone && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Sparkles className="w-2.5 h-2.5" />
                  IA
                </span>
              )}
              {isLoading && (
                <span className="flex items-center gap-1 text-[10px] text-primary-foreground/80">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Traduction…
                </span>
              )}
              {justDone && (
                <span className="flex items-center gap-1 text-[10px] text-green-600">
                  <Check className="w-2.5 h-2.5" />
                  Traduit
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      {siteLangs.length > 1 && (
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          Les langues non-défaut sont traduites automatiquement via IA au premier clic.
        </p>
      )}
    </div>
  );
}
