import { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import {
  Save,
  Globe,
  Palette,
  Shield,
  Database,
  Bell,
  Loader2,
  ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, updateSettings, uploadTemplateImage, SiteBuilderSettings } from '../../services/siteBuilderService';

export default function AdminSettings({ embedded }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<SiteBuilderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch {
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSettings({
        domain_settings: settings.domain_settings,
        branding: settings.branding,
        limits: settings.limits,
        features: settings.features,
        notifications: settings.notifications,
      });
      setSettings(updated);
      toast.success('Paramètres sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateDomain = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, domain_settings: { ...prev.domain_settings, [key]: value } } : prev);
  };

  const updateBranding = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, branding: { ...prev.branding, [key]: value } } : prev);
  };

  const updateLimits = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, limits: { ...prev.limits, [key]: value } } : prev);
  };

  const updateFeatures = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, features: { ...prev.features, [key]: value } } : prev);
  };

  const updateNotifications = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, notifications: { ...prev.notifications, [key]: value } } : prev);
  };

  if (loading) {
    return (
      <AdminLayout title="Paramètres" embedded={embedded}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!settings) {
    return (
      <AdminLayout title="Paramètres" embedded={embedded}>
        <div className="text-center py-20 text-muted-foreground">
          Impossible de charger les paramètres
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Paramètres" embedded={embedded}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Paramètres</h1>
            <p className="text-muted-foreground">
              Configurez les paramètres globaux de la plateforme
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>

        {/* Domain Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Domaines</CardTitle>
                <CardDescription>Configuration des domaines par défaut</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultDomain">Domaine par défaut</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">https://</span>
                <Input
                  id="siteName"
                  placeholder="nom-du-site"
                  className="w-40"
                  disabled
                />
                <span className="text-muted-foreground">.</span>
                <Input
                  id="defaultDomain"
                  value={settings.domain_settings.defaultDomain}
                  onChange={(e) => updateDomain('defaultDomain', e.target.value)}
                  className="w-40"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Les sites auront par défaut un sous-domaine sur ce domaine
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Autoriser les domaines personnalisés</Label>
                <p className="text-sm text-muted-foreground">
                  Les utilisateurs peuvent connecter leur propre domaine
                </p>
              </div>
              <Switch
                checked={settings.domain_settings.allowCustomDomains}
                onCheckedChange={(checked) => updateDomain('allowCustomDomains', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Personnalisez l'apparence de la plateforme</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platformName">Nom de la plateforme</Label>
                <Input
                  id="platformName"
                  value={settings.branding.platformName}
                  onChange={(e) => updateBranding('platformName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur principale</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateBranding('primaryColor', e.target.value)}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={(e) => updateBranding('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors relative overflow-hidden shrink-0">
                  {uploadingLogo ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : settings.branding.logoUrl ? (
                    <>
                      <img src={settings.branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Changer</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">Upload logo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("L'image ne doit pas dépasser 5 Mo");
                        return;
                      }
                      setUploadingLogo(true);
                      try {
                        const result = await uploadTemplateImage(file);
                        updateBranding('logoUrl', result.path);
                        toast.success('Logo uploadé');
                      } catch {
                        toast.error("Erreur lors de l'upload");
                      } finally {
                        setUploadingLogo(false);
                      }
                    }}
                  />
                </label>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="logoUrl" className="text-xs text-muted-foreground">Ou collez une URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings.branding.logoUrl}
                    onChange={(e) => updateBranding('logoUrl', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <CardTitle>Limites</CardTitle>
                <CardDescription>Définissez les limites par utilisateur</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxSites">Sites max / utilisateur</Label>
                <Input
                  id="maxSites"
                  type="number"
                  value={settings.limits.maxSitesPerUser}
                  onChange={(e) => updateLimits('maxSitesPerUser', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPages">Pages max / site</Label>
                <Input
                  id="maxPages"
                  type="number"
                  value={settings.limits.maxPagesPerSite}
                  onChange={(e) => updateLimits('maxPagesPerSite', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStorage">Stockage max (Go)</Label>
                <Input
                  id="maxStorage"
                  type="number"
                  value={settings.limits.maxStorageGB}
                  onChange={(e) => updateLimits('maxStorageGB', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle>Fonctionnalités</CardTitle>
                <CardDescription>Activez ou désactivez des fonctionnalités</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Analytics intégré</Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux utilisateurs de voir les statistiques de leur site
                </p>
              </div>
              <Switch
                checked={settings.features.enableAnalytics}
                onCheckedChange={(checked) => updateFeatures('enableAnalytics', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Outils SEO</Label>
                <p className="text-sm text-muted-foreground">
                  Accès aux meta tags, sitemap et autres outils SEO
                </p>
              </div>
              <Switch
                checked={settings.features.enableSEO}
                onCheckedChange={(checked) => updateFeatures('enableSEO', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Code personnalisé</Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser l'injection de HTML/CSS/JS personnalisé
                </p>
              </div>
              <Switch
                checked={settings.features.enableCustomCode}
                onCheckedChange={(checked) => updateFeatures('enableCustomCode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Gérez les notifications système</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Notifications par email</Label>
                <p className="text-sm text-muted-foreground">
                  Envoyer des emails pour les événements importants
                </p>
              </div>
              <Switch
                checked={settings.notifications.emailNotifications}
                onCheckedChange={(checked) => updateNotifications('emailNotifications', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Alertes administrateur</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des alertes pour les problèmes critiques
                </p>
              </div>
              <Switch
                checked={settings.notifications.adminAlerts}
                onCheckedChange={(checked) => updateNotifications('adminAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
