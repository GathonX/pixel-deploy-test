import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import {
  Palette, Type, Maximize, RotateCcw,
  Sun, Moon, Code, Sparkles
} from 'lucide-react';
import { luxiosGlobalStore } from './sections/luxios/luxiosGlobalStore';

interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    card: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    sectionPadding: number;
    containerWidth: number;
    borderRadius: number;
  };
  customCSS: string;
}

interface ThemeEditorProps {
  siteId: string;
  initialTheme?: Partial<ThemeConfig>;
  onThemeChange: (theme: ThemeConfig) => void;
  isLuxiosTemplate?: boolean;
  /** Display name of the current template, e.g. 'Luxios Hotel & Resort' */
  templateName?: string;
}

const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    accent: '#a855f7',
    background: '#ffffff',
    foreground: '#0a0a0a',
    muted: '#f5f5f5',
    card: '#ffffff',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  spacing: {
    sectionPadding: 80,
    containerWidth: 1200,
    borderRadius: 12,
  },
  customCSS: '',
};

const fontOptions = [
  'Inter',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Playfair Display',
  'Lora',
  'Merriweather',
  'Raleway',
  'Space Grotesk',
];

const presetThemes = [
  {
    name: 'Violet Moderne',
    colors: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#a855f7',
      background: '#ffffff',
      foreground: '#0a0a0a',
      muted: '#f5f5f5',
      card: '#ffffff',
    },
  },
  {
    name: 'Océan Profond',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#14b8a6',
      background: '#0f172a',
      foreground: '#f8fafc',
      muted: '#1e293b',
      card: '#1e293b',
    },
  },
  {
    name: 'Émeraude Nature',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#34d399',
      background: '#ffffff',
      foreground: '#064e3b',
      muted: '#ecfdf5',
      card: '#ffffff',
    },
  },
  {
    name: 'Rose Élégant',
    colors: {
      primary: '#ec4899',
      secondary: '#db2777',
      accent: '#f472b6',
      background: '#fdf2f8',
      foreground: '#831843',
      muted: '#fce7f3',
      card: '#ffffff',
    },
  },
  {
    name: 'Noir Minimaliste',
    colors: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
      accent: '#e4e4e7',
      background: '#09090b',
      foreground: '#fafafa',
      muted: '#18181b',
      card: '#18181b',
    },
  },
  {
    name: 'Orange Chaleureux',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fb923c',
      background: '#fffbeb',
      foreground: '#451a03',
      muted: '#fef3c7',
      card: '#ffffff',
    },
  },
];

export function ThemeEditor({ siteId, initialTheme, onThemeChange, isLuxiosTemplate, templateName }: ThemeEditorProps) {
  const [theme, setTheme] = useState<ThemeConfig>({
    ...defaultTheme,
    ...initialTheme,
  });

  // Garde : empêche la sauvegarde automatique quand initialTheme est vide (chargement async)
  // Sans ça, le thème par défaut écraserait le thème sauvegardé après 1,5s au refresh
  const skipSaveRef = useRef(
    !initialTheme || Object.keys(initialTheme as Record<string, unknown>).length === 0
  );

  // Synchronisation quand initialTheme se peuple après chargement async du site
  // (scénario : rechargement direct de la page editeur — sites chargés en async)
  useEffect(() => {
    const hasData = initialTheme && Object.keys(initialTheme as Record<string, unknown>).length > 0;
    if (hasData) {
      skipSaveRef.current = false;
      setTheme({ ...defaultTheme, ...(initialTheme as Partial<ThemeConfig>) });
    }
  // On écoute uniquement quand initialTheme passe de vide à rempli
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialTheme)]);

  // Apply theme to preview in real-time
  useEffect(() => {
    applyThemeToPreview(theme);
  }, [theme]);

  const applyThemeToPreview = (themeConfig: ThemeConfig) => {
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Create style element for preview
    let styleEl = document.getElementById('theme-preview-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-preview-styles';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root {
        --theme-primary: ${hexToHsl(themeConfig.colors.primary)};
        --theme-secondary: ${hexToHsl(themeConfig.colors.secondary)};
        --theme-accent: ${hexToHsl(themeConfig.colors.accent)};
        --theme-background: ${hexToHsl(themeConfig.colors.background)};
        --theme-foreground: ${hexToHsl(themeConfig.colors.foreground)};
        --theme-muted: ${hexToHsl(themeConfig.colors.muted)};
        --theme-card: ${hexToHsl(themeConfig.colors.card)};
        --theme-font-heading: '${themeConfig.fonts.heading}', sans-serif;
        --theme-font-body: '${themeConfig.fonts.body}', sans-serif;
        --theme-section-padding: ${themeConfig.spacing.sectionPadding}px;
        --theme-container-width: ${themeConfig.spacing.containerWidth}px;
        --theme-border-radius: ${themeConfig.spacing.borderRadius}px;
      }
      
      .theme-preview {
        --primary: var(--theme-primary);
        --secondary: var(--theme-secondary);
        --accent: var(--theme-accent);
        --background: var(--theme-background);
        --foreground: var(--theme-foreground);
        --muted: var(--theme-muted);
        --card: var(--theme-card);
        font-family: var(--theme-font-body);
      }
      
      .theme-preview h1, .theme-preview h2, .theme-preview h3, 
      .theme-preview h4, .theme-preview h5, .theme-preview h6 {
        font-family: var(--theme-font-heading);
      }
      
      .theme-preview section {
        padding: var(--theme-section-padding) 0;
      }
      
      .theme-preview .container {
        max-width: var(--theme-container-width);
      }
      
      ${themeConfig.customCSS}
    `;

    // Ne pas sauvegarder si le thème vient du defaultTheme (initialTheme vide au chargement async)
    if (!skipSaveRef.current) {
      onThemeChange(themeConfig);
    }

    // Push color changes to all Luxios sections in real-time
    if (isLuxiosTemplate) {
      luxiosGlobalStore.set({
        gold: themeConfig.colors.accent,
        bg:   themeConfig.colors.background,
        fg:   themeConfig.colors.foreground,
      });
    }
  };

  const updateColor = (key: keyof ThemeConfig['colors'], value: string) => {
    setTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateFont = (key: keyof ThemeConfig['fonts'], value: string) => {
    setTheme(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [key]: value },
    }));
  };

  const updateSpacing = (key: keyof ThemeConfig['spacing'], value: number) => {
    setTheme(prev => ({
      ...prev,
      spacing: { ...prev.spacing, [key]: value },
    }));
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setTheme(prev => ({
      ...prev,
      colors: preset.colors,
    }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Thème Global</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={resetTheme}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Réinitialiser
        </Button>
      </div>

      {isLuxiosTemplate && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs">
          <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Thème {templateName || 'Template'}</p>
          <p className="text-blue-600 dark:text-blue-300/80">Modifiez <strong>Accent</strong>, <strong>Background</strong> et <strong>Foreground</strong> dans l'onglet Couleurs pour changer la palette globale du site. Le CSS personnalisé permet des surcharges avancées.</p>
        </div>
      )}

      <Tabs defaultValue="colors" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b px-4 overflow-x-auto shrink-0 h-auto py-1 bg-background">
          <TabsTrigger value="colors" className="gap-2 shrink-0" title="Couleurs - Palette et thème visuel">
            <Palette className="w-4 h-4" />
            Couleurs
          </TabsTrigger>
          <TabsTrigger value="fonts" className="gap-2 shrink-0" title="Polices - Typographie du site">
            <Type className="w-4 h-4" />
            Polices
          </TabsTrigger>
          <TabsTrigger value="spacing" className="gap-2 shrink-0" title="Espaces - Marges et bordures">
            <Maximize className="w-4 h-4" />
            Espaces
          </TabsTrigger>
          <TabsTrigger value="css" className="gap-2 shrink-0" title="CSS - Code personnalisé avancé">
            <Code className="w-4 h-4" />
            CSS
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 h-0">
          <TabsContent value="colors" className="p-4 space-y-6 m-0">
            {/* Presets */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">Thèmes prédéfinis</Label>
              <div className="grid grid-cols-3 gap-2">
                {presetThemes.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="group p-2 rounded-lg border hover:border-primary transition-colors"
                  >
                    <div className="flex gap-1 mb-1">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: preset.colors.primary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: preset.colors.secondary }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: preset.colors.background }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground group-hover:text-foreground truncate">
                      {preset.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Colors */}
            <div className="space-y-4">
              <Label className="text-xs font-medium uppercase text-muted-foreground">Couleurs personnalisées</Label>
              
              {Object.entries(theme.colors).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => updateColor(key as keyof ThemeConfig['colors'], e.target.value)}
                      className="w-10 h-10 rounded-lg border cursor-pointer bg-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm capitalize">{key}</Label>
                    <Input
                      value={value}
                      onChange={(e) => updateColor(key as keyof ThemeConfig['colors'], e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Live Preview */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">Aperçu</Label>
              <div 
                className="p-4 rounded-lg border"
                style={{ 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.foreground 
                }}
              >
                <h4 style={{ color: theme.colors.primary }} className="font-bold mb-2">
                  Titre Principal
                </h4>
                <p className="text-sm mb-3 opacity-70">
                  Texte de paragraphe avec la couleur de fond et texte appliquées.
                </p>
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1.5 rounded text-sm font-medium"
                    style={{ 
                      backgroundColor: theme.colors.primary,
                      color: theme.colors.background 
                    }}
                  >
                    Bouton Principal
                  </button>
                  <button 
                    className="px-3 py-1.5 rounded text-sm font-medium border"
                    style={{ 
                      borderColor: theme.colors.secondary,
                      color: theme.colors.secondary 
                    }}
                  >
                    Secondaire
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="p-4 space-y-6 m-0">
            {isLuxiosTemplate && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Polices {templateName || 'Template'}</p>
                <p className="text-amber-600 dark:text-amber-300/80">Ce template utilise des polices spécifiques intégrées à son design. Ces sélecteurs ne les remplacent pas.</p>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Police des titres</Label>
                <Select value={theme.fonts.heading} onValueChange={(v) => updateFont('heading', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Police du corps</Label>
                <Select value={theme.fonts.body} onValueChange={(v) => updateFont('body', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontOptions.map((font) => (
                      <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Font Preview */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">Aperçu typographie</Label>
              <div className="p-4 rounded-lg border space-y-3">
                <h1 
                  className="text-2xl font-bold"
                  style={{ fontFamily: `'${theme.fonts.heading}', sans-serif` }}
                >
                  Titre en {theme.fonts.heading}
                </h1>
                <h2 
                  className="text-xl font-semibold"
                  style={{ fontFamily: `'${theme.fonts.heading}', sans-serif` }}
                >
                  Sous-titre de page
                </h2>
                <p 
                  className="text-sm text-muted-foreground"
                  style={{ fontFamily: `'${theme.fonts.body}', sans-serif` }}
                >
                  Ceci est un paragraphe de texte utilisant la police {theme.fonts.body}. 
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                  Sed do eiusmod tempor incididunt ut labore.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spacing" className="p-4 space-y-6 m-0">
            {isLuxiosTemplate && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Espaces {templateName || 'Template'}</p>
                <p className="text-amber-600 dark:text-amber-300/80">Pour ajuster le padding et la largeur max de chaque section, sélectionnez la section et utilisez l'onglet <strong>Layout</strong>. Ces sliders globaux ne s'appliquent pas à ce template.</p>
              </div>
            )}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Padding des sections</Label>
                  <span className="text-sm text-muted-foreground">{theme.spacing.sectionPadding}px</span>
                </div>
                <Slider
                  value={[theme.spacing.sectionPadding]}
                  onValueChange={([v]) => updateSpacing('sectionPadding', v)}
                  min={20}
                  max={200}
                  step={10}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Largeur du conteneur</Label>
                  <span className="text-sm text-muted-foreground">{theme.spacing.containerWidth}px</span>
                </div>
                <Slider
                  value={[theme.spacing.containerWidth]}
                  onValueChange={([v]) => updateSpacing('containerWidth', v)}
                  min={800}
                  max={1600}
                  step={50}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Rayon des bordures</Label>
                  <span className="text-sm text-muted-foreground">{theme.spacing.borderRadius}px</span>
                </div>
                <Slider
                  value={[theme.spacing.borderRadius]}
                  onValueChange={([v]) => updateSpacing('borderRadius', v)}
                  min={0}
                  max={32}
                  step={2}
                />
              </div>
            </div>

            <Separator />

            {/* Spacing Preview */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">Aperçu espacement</Label>
              <div 
                className="border bg-muted/30"
                style={{ padding: `${theme.spacing.sectionPadding / 4}px` }}
              >
                <div 
                  className="bg-primary/10 border-2 border-dashed border-primary/30 mx-auto p-4"
                  style={{ 
                    maxWidth: `${theme.spacing.containerWidth / 5}px`,
                    borderRadius: `${theme.spacing.borderRadius}px`
                  }}
                >
                  <div 
                    className="bg-primary text-primary-foreground text-center text-xs py-2"
                    style={{ borderRadius: `${theme.spacing.borderRadius / 2}px` }}
                  >
                    Conteneur
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="css" className="p-4 space-y-4 m-0">
            <div className="space-y-2">
              <Label>CSS Personnalisé</Label>
              <p className="text-xs text-muted-foreground">
                Ajoutez du CSS personnalisé pour affiner le design de votre site.
              </p>
            </div>

            <Textarea
              value={theme.customCSS}
              onChange={(e) => setTheme(prev => ({ ...prev, customCSS: e.target.value }))}
              placeholder={`.my-class {
  color: red;
}

section.hero {
  min-height: 100vh;
}`}
              className="font-mono text-xs h-64"
            />

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Variables CSS disponibles :</p>
              <code className="block">--theme-primary</code>
              <code className="block">--theme-secondary</code>
              <code className="block">--theme-accent</code>
              <code className="block">--theme-background</code>
              <code className="block">--theme-foreground</code>
              <code className="block">--theme-section-padding</code>
              <code className="block">--theme-container-width</code>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
