// react-frontend/src/pages/CreateBlogPost.tsx
// ✅ Composant pour création manuelle d'articles de blog

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  Loader2,
  Plus,
  Save,
  Tag,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ✅ Imports des services backend
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blogService } from "@/services/blogService";
import { Category, categoryService } from "@/services/categoryService";
import BlogImageUpload from '@/components/BlogImageUpload';

const CreateBlogPost = () => {
  const navigate = useNavigate();

  // ✅ États pour le formulaire
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // ✅ États pour les champs du formulaire
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    header_image: "",
    tags: [] as string[],
    categories: [] as string[],
    status: "draft" as "draft" | "scheduled" | "published",
    scheduled_at: "",
  });

  // ✅ États pour les catégories
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // ✅ États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // ✅ Charger les catégories disponibles
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const categories = await categoryService.getCategories({
          type: 'blog',
          is_active: true,
          per_page: 100
        });
        setAvailableCategories(categories);
      } catch (error) {
        console.error("Erreur chargement catégories:", error);
        setAvailableCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // ✅ Validation des champs
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    } else if (formData.title.length < 3) {
      newErrors.title = "Le titre doit contenir au moins 3 caractères";
    } else if (formData.title.length > 255) {
      newErrors.title = "Le titre ne peut pas dépasser 255 caractères";
    }

    if (!formData.summary.trim()) {
      newErrors.summary = "Le résumé est requis";
    } else if (formData.summary.length < 10) {
      newErrors.summary = "Le résumé doit contenir au moins 10 caractères";
    } else if (formData.summary.length > 500) {
      newErrors.summary = "Le résumé ne peut pas dépasser 500 caractères";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Le contenu est requis";
    } else if (formData.content.length < 20) {
      newErrors.content = "Le contenu doit contenir au moins 20 caractères";
    }

    // Validation de la date pour les posts programmés
    if (formData.status === "scheduled" && !formData.scheduled_at) {
      newErrors.scheduled_at = "La date de publication est requise pour un post programmé";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Gestion des changements de formulaire
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // ✅ Nettoyer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // ✅ Gestion des tags
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleFormChange("tags", [...formData.tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleFormChange("tags", formData.tags.filter(tag => tag !== tagToRemove));
  };

  // ✅ Gestion des catégories
  const addCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      handleFormChange("categories", [...formData.categories, newCategory.trim()]);
      setNewCategory("");
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    handleFormChange("categories", formData.categories.filter(cat => cat !== categoryToRemove));
  };

  // ✅ Sauvegarde de l'article
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    try {
      setSaving(true);

      // ✅ Créer l'article via l'API
      const newPost = await blogService.createBlogPost({
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        content: formData.content.trim(),
        header_image: formData.header_image || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        status: formData.status,
        scheduled_at: formData.status === "scheduled" ? formData.scheduled_at : undefined,
      });

      console.log("✅ Article créé:", newPost);
      
      toast.success("Article créé avec succès!", {
        description: `L'article "${formData.title}" a été créé en tant que ${formData.status === 'draft' ? 'brouillon' : formData.status === 'published' ? 'publié' : 'programmé'}.`
      });

      // ✅ Rediriger vers la page des blogs par défaut
      navigate("/dashboard/default-blog");

    } catch (error: any) {
      console.error("❌ Erreur création article:", error);
      
      if (error.response?.data?.errors) {
        // ✅ Erreurs de validation du serveur
        const serverErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            serverErrors[field] = messages[0];
          }
        });
        setErrors(serverErrors);
        toast.error("Erreurs de validation", {
          description: "Veuillez corriger les erreurs signalées"
        });
      } else {
        toast.error("Erreur lors de la création", {
          description: error.response?.data?.message || "Une erreur inattendue s'est produite"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // ✅ Navigation retour
  const handleGoBack = () => {
    if (isDirty) {
      if (window.confirm("Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?")) {
        navigate("/dashboard/default-blog");
      }
    } else {
      navigate("/dashboard/default-blog");
    }
  };

  // ✅ Convertir le texte en HTML simple pour le préview
  const convertTextToHtml = (text: string): string => {
    if (!text) return "";
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* ✅ Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={handleGoBack}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Créer un nouvel article</h1>
              <p className="text-muted-foreground">
                Rédigez votre article de blog manuellement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              disabled={saving}
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Édition" : "Prévisualiser"}
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Créer l'article
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ✅ Formulaire principal */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {previewMode ? (
                    <Eye className="h-5 w-5 mr-2" />
                  ) : (
                    <Plus className="h-5 w-5 mr-2" />
                  )}
                  {previewMode ? "Prévisualisation" : "Contenu de l'article"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!previewMode ? (
                  <>
                    {/* Titre */}
                    <div>
                      <Label htmlFor="title">Titre *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleFormChange("title", e.target.value)}
                        placeholder="Titre de votre article..."
                        className={errors.title ? "border-red-500" : ""}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                      )}
                    </div>

                    {/* Résumé */}
                    <div>
                      <Label htmlFor="summary">Résumé *</Label>
                      <Textarea
                        id="summary"
                        value={formData.summary}
                        onChange={(e) => handleFormChange("summary", e.target.value)}
                        placeholder="Résumé de votre article..."
                        className={`min-h-[100px] ${errors.summary ? "border-red-500" : ""}`}
                      />
                      {errors.summary && (
                        <p className="text-sm text-red-500 mt-1">{errors.summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.summary.length}/500 caractères
                      </p>
                    </div>

                    {/* Contenu */}
                    <div>
                      <Label htmlFor="content">Contenu *</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => handleFormChange("content", e.target.value)}
                        placeholder="Contenu complet de votre article..."
                        className={`min-h-[300px] ${errors.content ? "border-red-500" : ""}`}
                      />
                      {errors.content && (
                        <p className="text-sm text-red-500 mt-1">{errors.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.content.length} caractères
                      </p>
                    </div>
                  </>
                ) : (
                  /* ✅ Mode prévisualisation */
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {formData.title || "Titre de l'article"}
                      </h2>
                      {formData.header_image && (
                        <img 
                          src={formData.header_image} 
                          alt="Image d'en-tête"
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <p className="text-muted-foreground mb-4">
                        {formData.summary || "Résumé de l'article"}
                      </p>
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: convertTextToHtml(formData.content) || "<p>Contenu de l'article</p>" 
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ✅ Sidebar */}
          <div className="space-y-6">
            {/* Statut */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Statut de publication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleFormChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="scheduled">Programmé</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date et heure de publication pour posts programmés */}
                {formData.status === "scheduled" && (
                  <div>
                    <Label htmlFor="scheduled_at">Date et heure de publication *</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => handleFormChange("scheduled_at", e.target.value)}
                      className={errors.scheduled_at ? "border-red-500" : ""}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {errors.scheduled_at && (
                      <p className="text-sm text-red-500 mt-1">{errors.scheduled_at}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Vous pouvez programmer plusieurs posts pour la même date
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image d'en-tête */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Image d'en-tête</CardTitle>
              </CardHeader>
              <CardContent>
                <BlogImageUpload
                  currentImage={formData.header_image}
                  onUploadSuccess={(_, fullUrl) => handleFormChange("header_image", fullUrl)}
                  onRemove={() => handleFormChange("header_image", "")}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nouveau tag..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={addTag}
                      disabled={!newTag.trim()}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Catégories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Catégories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nouvelle catégorie..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={addCategory}
                      disabled={!newCategory.trim()}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {formData.categories.map((category, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                  {!loadingCategories && availableCategories.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">
                        Catégories disponibles :
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {availableCategories
                          .filter(cat => !formData.categories.includes(cat.name))
                          .slice(0, 8)
                          .map((category) => (
                          <Button
                            key={category.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => handleFormChange("categories", [...formData.categories, category.name])}
                          >
                            {category.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Aide */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Les champs marqués d'un * sont obligatoires. 
                Votre article sera créé en tant que <strong>{formData.status === 'draft' ? 'brouillon' : formData.status === 'published' ? 'publié' : 'programmé'}</strong>.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateBlogPost;