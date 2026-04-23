import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, X, Save, Sparkles } from 'lucide-react';
import { adminBlogService, AdminProjectInfo, AdminProjectInfoData } from '@/services/adminBlogService';
import { toast } from 'react-toastify';

interface AdminProjectInfoFormProps {
  onSave?: (data: AdminProjectInfo) => void;
}

export const AdminProjectInfoForm: React.FC<AdminProjectInfoFormProps> = ({ onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectInfo, setProjectInfo] = useState<AdminProjectInfo | null>(null);

  const [formData, setFormData] = useState<AdminProjectInfoData>({
    business_name: '',
    business_description: '',
    business_ideas: [],
    target_audience: [],
    keywords: [],
    industry: '',
    content_goals: '',
    tone_of_voice: 'professional',
    content_themes: [],
    auto_generation_enabled: true,
    posts_per_week: 7
  });

  const [currentIdea, setCurrentIdea] = useState('');
  const [currentAudience, setCurrentAudience] = useState('');
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [currentTheme, setCurrentTheme] = useState('');

  useEffect(() => {
    loadProjectInfo();
  }, []);

  const loadProjectInfo = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      const info = await adminBlogService.getAdminProjectInfo();

      console.log('📥 [AdminProjectInfoForm] Données reçues du serveur:', info);

      if (info) {
        setProjectInfo(info);
        const newFormData = {
          business_name: info.business_name || '',
          business_description: info.business_description || '',
          business_ideas: info.business_ideas || [],
          target_audience: info.target_audience || [],
          keywords: info.keywords || [],
          industry: info.industry || '',
          content_goals: info.content_goals || '',
          tone_of_voice: info.tone_of_voice || 'professional',
          content_themes: info.content_themes || [],
          auto_generation_enabled: info.auto_generation_enabled,
          posts_per_week: info.posts_per_week || 7
        };
        console.log('📝 [AdminProjectInfoForm] Mise à jour du formulaire avec:', newFormData);
        setFormData(newFormData);
      }
    } catch (error: any) {
      console.error('Erreur chargement infos projet:', error);
      if (!skipLoading) {
        toast.error(error.message || 'Erreur lors du chargement');
      }
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (field: keyof AdminProjectInfoData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addToArray = (field: 'business_ideas' | 'target_audience' | 'keywords' | 'content_themes', value: string) => {
    if (value.trim() && !(formData[field] || []).includes(value.trim())) {
      const newArray = [...(formData[field] || []), value.trim()];
      handleInputChange(field, newArray);
    }
  };

  const removeFromArray = (field: 'business_ideas' | 'target_audience' | 'keywords' | 'content_themes', value: string) => {
    const newArray = (formData[field] || []).filter(item => item !== value);
    handleInputChange(field, newArray);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.business_name || !formData.business_description) {
      toast.error('Veuillez remplir au moins le nom et la description du projet');
      return;
    }

    try {
      setSaving(true);
      const saved = await adminBlogService.saveAdminProjectInfo(formData);
      setProjectInfo(saved);

      // ✅ FIX: Recharger les données sauvegardées depuis le serveur (sans loader)
      await loadProjectInfo(true);

      toast.success('Informations sauvegardées avec succès !');
      onSave?.(saved);
    } catch (error: any) {
      console.error('Erreur sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Informations Projet Admin
            </CardTitle>
            <CardDescription>
              Ces informations seront utilisées pour générer automatiquement vos objectifs hebdomadaires et vos posts
            </CardDescription>
          </div>
          {projectInfo && (
            <Badge variant="outline">
              Dernière màj: {new Date(projectInfo.updated_at).toLocaleDateString('fr-FR')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div>
            <Label htmlFor="business_name">Nom du Business/Projet *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => handleInputChange('business_name', e.target.value)}
              placeholder="Ex: Mon SaaS Innovant"
              required
            />
          </div>

          {/* Business Description */}
          <div>
            <Label htmlFor="business_description">Description du Projet *</Label>
            <Textarea
              id="business_description"
              value={formData.business_description}
              onChange={(e) => handleInputChange('business_description', e.target.value)}
              placeholder="Décrivez votre projet, votre mission, votre vision..."
              rows={4}
              required
            />
          </div>

          {/* Industry */}
          <div>
            <Label htmlFor="industry">Secteur d'Activité</Label>
            <Select
              value={formData.industry || ''}
              onValueChange={(value) => handleInputChange('industry', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tech">Technologie</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="health">Santé</SelectItem>
                <SelectItem value="education">Éducation</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="food">Alimentation</SelectItem>
                <SelectItem value="travel">Voyage</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business Ideas */}
          <div>
            <Label>Idées Principales</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Ajoutez les idées clés que vous voulez communiquer
            </p>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentIdea}
                onChange={(e) => setCurrentIdea(e.target.value)}
                placeholder="Ex: Innovation, Productivité, Automatisation..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('business_ideas', currentIdea);
                    setCurrentIdea('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  addToArray('business_ideas', currentIdea);
                  setCurrentIdea('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.business_ideas || []).map((idea, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {idea}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFromArray('business_ideas', idea)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <Label>Public Cible</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentAudience}
                onChange={(e) => setCurrentAudience(e.target.value)}
                placeholder="Ex: Entrepreneurs, Développeurs, PME..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('target_audience', currentAudience);
                    setCurrentAudience('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  addToArray('target_audience', currentAudience);
                  setCurrentAudience('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.target_audience || []).map((audience, index) => (
                <Badge key={index} variant="default" className="flex items-center gap-1">
                  {audience}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFromArray('target_audience', audience)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <Label>Mots-clés Principaux</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentKeyword}
                onChange={(e) => setCurrentKeyword(e.target.value)}
                placeholder="Ex: SaaS, IA, Productivité..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('keywords', currentKeyword);
                    setCurrentKeyword('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  addToArray('keywords', currentKeyword);
                  setCurrentKeyword('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.keywords || []).map((keyword, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFromArray('keywords', keyword)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Content Themes */}
          <div>
            <Label>Thèmes de Contenu</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value)}
                placeholder="Ex: Tutoriels, Études de cas, Actualités..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addToArray('content_themes', currentTheme);
                    setCurrentTheme('');
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  addToArray('content_themes', currentTheme);
                  setCurrentTheme('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.content_themes || []).map((theme, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {theme}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFromArray('content_themes', theme)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Content Goals */}
          <div>
            <Label htmlFor="content_goals">Objectifs de Contenu</Label>
            <Textarea
              id="content_goals"
              value={formData.content_goals}
              onChange={(e) => handleInputChange('content_goals', e.target.value)}
              placeholder="Ex: Éduquer mon audience, générer des leads, augmenter l'engagement..."
              rows={3}
            />
          </div>

          {/* Tone of Voice */}
          <div>
            <Label htmlFor="tone_of_voice">Ton de Communication</Label>
            <Select
              value={formData.tone_of_voice}
              onValueChange={(value) => handleInputChange('tone_of_voice', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professionnel</SelectItem>
                <SelectItem value="casual">Décontracté</SelectItem>
                <SelectItem value="friendly">Amical</SelectItem>
                <SelectItem value="formal">Formel</SelectItem>
                <SelectItem value="humorous">Humoristique</SelectItem>
                <SelectItem value="inspirational">Inspirant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Posts Per Week */}
          <div>
            <Label htmlFor="posts_per_week">Nombre de Posts par Semaine</Label>
            <Input
              id="posts_per_week"
              type="number"
              min="1"
              max="7"
              value={formData.posts_per_week}
              onChange={(e) => handleInputChange('posts_per_week', parseInt(e.target.value) || 7)}
            />
          </div>

          {/* Auto Generation Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="auto_generation">Génération Automatique</Label>
              <p className="text-sm text-muted-foreground">
                Activer la génération automatique hebdomadaire
              </p>
            </div>
            <Switch
              id="auto_generation"
              checked={formData.auto_generation_enabled}
              onCheckedChange={(checked) => handleInputChange('auto_generation_enabled', checked)}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder les Informations
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
