import { useState } from 'react';
import { SeoConfig } from '@/types/platform';
import { ImageUploader } from '../ui/image-uploader';
import { SiteBuilderUploadContext } from '../../contexts/SiteBuilderUploadContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
  Search, Globe, Facebook, Twitter, Code,
  ChevronDown, Plus, X, Eye, AlertCircle,
  BarChart3, Tag, Image, FileCode, Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface SeoConfigEditorProps {
  siteId: string;
  siteName: string;
  siteDomain?: string;
  config: SeoConfig;
  onUpdate: (config: SeoConfig) => void;
  onClose: () => void;
}

const defaultSeoConfig: SeoConfig = {
  siteTitle: '',
  siteDescription: '',
  siteKeywords: [],
  robotsIndex: true,
  robotsFollow: true,
  twitterCardType: 'summary_large_image'
};

export function SeoConfigEditor({ siteId, siteName, siteDomain, config, onUpdate, onClose }: SeoConfigEditorProps) {
  const [seoConfig, setSeoConfig] = useState<SeoConfig>({
    ...defaultSeoConfig,
    siteTitle: siteName,
    ...config
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [openSections, setOpenSections] = useState<string[]>(['basic']);

  const updateConfig = <K extends keyof SeoConfig>(key: K, value: SeoConfig[K]) => {
    setSeoConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !seoConfig.siteKeywords.includes(newKeyword.trim())) {
      updateConfig('siteKeywords', [...seoConfig.siteKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateConfig('siteKeywords', seoConfig.siteKeywords.filter(k => k !== keyword));
  };

  const handleSave = () => {
    onUpdate(seoConfig);
    toast.success('Configuration SEO enregistrée');
  };

  const titleLength = seoConfig.siteTitle?.length || 0;
  const descriptionLength = seoConfig.siteDescription?.length || 0;

  return (
    <SiteBuilderUploadContext.Provider value={siteId}>
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Configuration SEO</h2>
            <p className="text-xs text-muted-foreground">Optimisez votre référencement</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="seo" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b px-4 shrink-0 overflow-x-auto">
          <TabsTrigger value="seo" className="gap-2 shrink-0" title="SEO - Référencement naturel">
            <Search className="w-4 h-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2 shrink-0" title="Tracking - Analyse et statistiques">
            <BarChart3 className="w-4 h-4" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2 shrink-0" title="Social - Partage sur les réseaux sociaux">
            <Globe className="w-4 h-4" />
            Social
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2 shrink-0" title="Avancé - Code personnalisé et balises meta">
            <Code className="w-4 h-4" />
            Avancé
          </TabsTrigger>
        </TabsList>

        {/* SEO Tab */}
        <TabsContent value="seo" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-6">
              {/* Google Preview */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Aperçu Google</span>
                </div>
                <div className="bg-background rounded-lg p-4 space-y-1">
                  <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                    {seoConfig.siteTitle || siteName || 'Titre de votre site'}
                  </div>
                  <div className="text-green-700 text-sm">
                    {seoConfig.canonicalUrl || siteDomain || `https://votre-site.com`}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {seoConfig.siteDescription || 'Ajoutez une description pour votre site...'}
                  </div>
                </div>
              </div>

              {/* Basic SEO */}
              <Collapsible open={openSections.includes('basic')} onOpenChange={() => toggleSection('basic')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="font-medium">Informations de base</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('basic') ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Titre du site</Label>
                      <span className={`text-xs ${titleLength > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {titleLength}/60
                      </span>
                    </div>
                    <Input 
                      value={seoConfig.siteTitle}
                      onChange={(e) => updateConfig('siteTitle', e.target.value)}
                      placeholder="Mon super site"
                    />
                    {titleLength > 60 && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Le titre est trop long pour les résultats Google
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta description</Label>
                      <span className={`text-xs ${descriptionLength > 160 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {descriptionLength}/160
                      </span>
                    </div>
                    <Textarea 
                      value={seoConfig.siteDescription}
                      onChange={(e) => updateConfig('siteDescription', e.target.value)}
                      placeholder="Une description accrocheuse de votre site..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mots-clés</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Ajouter un mot-clé"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <Button variant="outline" size="icon" onClick={addKeyword}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {seoConfig.siteKeywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {keyword}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-destructive" 
                            onClick={() => removeKeyword(keyword)}
                          />
                        </Badge>
                      ))}
                      {seoConfig.siteKeywords.length === 0 && (
                        <span className="text-xs text-muted-foreground">Aucun mot-clé ajouté</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>URL canonique</Label>
                    <Input 
                      value={seoConfig.canonicalUrl || ''}
                      onChange={(e) => updateConfig('canonicalUrl', e.target.value)}
                      placeholder="https://votre-site.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Laissez vide pour utiliser l'URL par défaut
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Images */}
              <Collapsible open={openSections.includes('images')} onOpenChange={() => toggleSection('images')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    <span className="font-medium">Images</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('images') ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <ImageUploader
                      value={seoConfig.favicon || ''}
                      onChange={(url) => updateConfig('favicon', url)}
                      placeholder="URL ou uploadez (ICO, PNG, SVG…)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Image Open Graph (partage social)</Label>
                    <ImageUploader
                      value={seoConfig.ogImage || ''}
                      onChange={(url) => updateConfig('ogImage', url)}
                      placeholder="URL ou uploadez — 1200×630 px recommandé"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommandé : 1200×630 pixels
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Indexing */}
              <Collapsible open={openSections.includes('indexing')} onOpenChange={() => toggleSection('indexing')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span className="font-medium">Indexation</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('indexing') ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Autoriser l'indexation</Label>
                      <p className="text-xs text-muted-foreground">Les moteurs de recherche peuvent indexer ce site</p>
                    </div>
                    <Switch
                      checked={seoConfig.robotsIndex}
                      onCheckedChange={(v) => updateConfig('robotsIndex', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Suivre les liens</Label>
                      <p className="text-xs text-muted-foreground">Les robots peuvent suivre les liens du site</p>
                    </div>
                    <Switch
                      checked={seoConfig.robotsFollow}
                      onCheckedChange={(v) => updateConfig('robotsFollow', v)}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Contact */}
              <Collapsible open={openSections.includes('contact')} onOpenChange={() => toggleSection('contact')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="font-medium">Formulaire de contact</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openSections.includes('contact') ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Email de réception des messages</Label>
                    <Input
                      type="email"
                      value={seoConfig.contactEmail || ''}
                      onChange={(e) => updateConfig('contactEmail', e.target.value)}
                      placeholder="contact@votre-hotel.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Les messages du formulaire de contact seront envoyés à cette adresse. Par défaut, votre adresse de compte est utilisée.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-6">
              {/* Google Analytics */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Google Analytics</h3>
                    <p className="text-xs text-muted-foreground">Suivez le trafic de votre site</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ID de mesure (GA4)</Label>
                  <Input 
                    value={seoConfig.googleAnalyticsId || ''}
                    onChange={(e) => updateConfig('googleAnalyticsId', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Trouvez-le dans Admin → Flux de données → Détails du flux
                  </p>
                </div>
              </div>

              {/* Google Tag Manager */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Code className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Google Tag Manager</h3>
                    <p className="text-xs text-muted-foreground">Gérez tous vos tags en un seul endroit</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ID du conteneur</Label>
                  <Input 
                    value={seoConfig.googleTagManagerId || ''}
                    onChange={(e) => updateConfig('googleTagManagerId', e.target.value)}
                    placeholder="GTM-XXXXXXX"
                  />
                </div>
              </div>

              {/* Google Search Console */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Search className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Google Search Console</h3>
                    <p className="text-xs text-muted-foreground">Vérification de propriété</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Code de vérification</Label>
                  <Input 
                    value={seoConfig.googleSearchConsoleId || ''}
                    onChange={(e) => updateConfig('googleSearchConsoleId', e.target.value)}
                    placeholder="google-site-verification=XXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Utilisez la méthode "Balise HTML" dans Search Console
                  </p>
                </div>
              </div>

              {/* Facebook Pixel */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Facebook Pixel</h3>
                    <p className="text-xs text-muted-foreground">Suivez les conversions et créez des audiences</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ID du Pixel</Label>
                  <Input 
                    value={seoConfig.facebookPixelId || ''}
                    onChange={(e) => updateConfig('facebookPixelId', e.target.value)}
                    placeholder="123456789012345"
                  />
                  <p className="text-xs text-muted-foreground">
                    Trouvez-le dans Meta Business Suite → Gestionnaire d'événements
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-6">
              {/* Facebook */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                    <Facebook className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Facebook / Meta</h3>
                    <p className="text-xs text-muted-foreground">Optimisez le partage sur Facebook</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>App ID Facebook</Label>
                  <Input 
                    value={seoConfig.facebookAppId || ''}
                    onChange={(e) => updateConfig('facebookAppId', e.target.value)}
                    placeholder="123456789012345"
                  />
                </div>

                {/* Facebook Preview */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-2">Aperçu du partage</p>
                  <div className="bg-background rounded border overflow-hidden">
                    <div className="aspect-[1.91/1] bg-muted flex items-center justify-center">
                      {seoConfig.ogImage ? (
                        <img src={seoConfig.ogImage} alt="OG" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground uppercase">{siteDomain ? siteDomain.replace('https://', '') : 'votre-site.com'}</p>
                      <p className="font-medium text-sm truncate">{seoConfig.siteTitle || siteName}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{seoConfig.siteDescription || 'Description...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Twitter className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Twitter / X</h3>
                    <p className="text-xs text-muted-foreground">Optimisez le partage sur Twitter</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Compte Twitter</Label>
                  <Input 
                    value={seoConfig.twitterHandle || ''}
                    onChange={(e) => updateConfig('twitterHandle', e.target.value)}
                    placeholder="@votrecompte"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type de carte</Label>
                  <Select 
                    value={seoConfig.twitterCardType || 'summary_large_image'}
                    onValueChange={(v) => updateConfig('twitterCardType', v as 'summary' | 'summary_large_image')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Résumé (petite image)</SelectItem>
                      <SelectItem value="summary_large_image">Grande image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="m-0 flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 space-y-6">
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-700 dark:text-amber-400">Zone avancée</h3>
                    <p className="text-sm text-amber-600 dark:text-amber-300/80">
                      Le code personnalisé peut affecter les performances et la sécurité de votre site.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <Label>Code personnalisé (Head)</Label>
                </div>
                <Textarea 
                  value={seoConfig.customHeadCode || ''}
                  onChange={(e) => updateConfig('customHeadCode', e.target.value)}
                  placeholder="<!-- Scripts, meta tags, etc. -->"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ce code sera injecté dans la balise &lt;head&gt;
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <Label>Code personnalisé (Body)</Label>
                </div>
                <Textarea 
                  value={seoConfig.customBodyCode || ''}
                  onChange={(e) => updateConfig('customBodyCode', e.target.value)}
                  placeholder="<!-- Scripts de fin de page -->"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ce code sera injecté avant la fermeture de &lt;/body&gt;
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t bg-muted/30 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={handleSave}>
          Enregistrer la configuration
        </Button>
      </div>
    </div>
    </SiteBuilderUploadContext.Provider>
  );
}
