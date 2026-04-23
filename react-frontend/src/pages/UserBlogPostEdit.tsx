// react-frontend/src/pages/UserBlogPostEdit.tsx
// ✅ VERSION COMPLÈTE MISE À JOUR avec BlogImageUpload

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import api from "@/services/api" // ✅ Import du service API principal
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
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// ✅ Imports des services backend + BlogImageUpload
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adaptBlogPostForFrontend } from "@/data/blogData";
import { blogService, BlogPost } from "@/services/blogService";
import { Category, categoryService } from "@/services/categoryService";
import BlogImageUpload from '@/components/BlogImageUpload'; // ✅ NOUVEAU : Import du composant réutilisable
import { RichTextEditor } from '@/components/RichTextEditor'; // ✅ NOUVEAU : Import du RichTextEditor TipTap

const UserBlogPostEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ États pour les données du post
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // ✅ États pour les champs modifiables
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    header_image: "",
    tags: [] as string[],
    categories: [] as string[],
    status: "draft" as "draft" | "scheduled" | "published",
    published_at: "",
  });

  // ✅ États pour les catégories
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // ✅ États de validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // ✅ NOUVELLES FONCTIONS : Gestion du contenu HTML pour TipTap
  // TipTap travaille directement avec du HTML, donc on ne nettoie plus
  const stripHtmlTags = (html: string): string => {
    // On garde le HTML tel quel pour TipTap
    return html || "";
  };

  const convertTextToHtml = (text: string): string => {
    // TipTap retourne déjà du HTML, on le garde tel quel
    return text || "";
  };

  // ✅ CORRECTION PRINCIPALE : Charger le post ET initialiser les champs
  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        toast.error("ID du post manquant");
        navigate("/mon-actualite");
        return;
      }

      try {
        setLoading(true);
        const backendPost = await blogService.getBlogPost(Number(id));
        
        console.log("🔍 [DEBUG] Raw backend data:", backendPost);
        
        const adaptedPost = adaptBlogPostForFrontend(backendPost);
        
        console.log("🔍 [DEBUG] Adapted post:", adaptedPost);

        setPost(adaptedPost);
        
        // ✅ CORRECTION : Nettoyer le contenu HTML pour l'affichage utilisateur
        const initialFormData = {
          title: adaptedPost.title || "",
          summary: adaptedPost.summary || "",
          content: stripHtmlTags(adaptedPost.content || ""),
          header_image: adaptedPost.header_image || "",
          tags: adaptedPost.tags || [],
          categories: adaptedPost.categories?.map((cat) => cat.name) || [],
          status: adaptedPost.status || "draft",
          published_at: adaptedPost.published_at || "",
        };

        setFormData(initialFormData);

        console.log(`✅ Post "${adaptedPost.title || 'Sans titre'}" chargé pour édition`);
        console.log("✅ Données du formulaire initialisées:", initialFormData);
        
      } catch (error) {
        console.error("Erreur chargement post:", error);
        toast.error("Erreur lors du chargement du post");
        navigate("/mon-actualite");
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id, navigate]);

  // ✅ CORRECTION : Charger les catégories avec validation
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const categories = await categoryService.getBlogCategories(true);
        
        const validCategories = categories.filter(cat => 
          cat && 
          cat.name && 
          cat.name.trim() !== "" &&
          cat.slug && 
          cat.slug.trim() !== ""
        );
        
        console.log(`🔍 [DEBUG] Catégories valides: ${validCategories.length}/${categories.length}`);
        setAvailableCategories(validCategories);
      } catch (error) {
        console.error("Erreur chargement catégories:", error);
        setAvailableCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // ✅ AMÉLIORATION : Détecter les changements de manière plus fiable
  useEffect(() => {
    if (post && formData.title !== "") {
      const originalData = {
        title: post.title || "",
        summary: post.summary || "",
        content: stripHtmlTags(post.content || ""),
        header_image: post.header_image || "",
        tags: post.tags || [],
        categories: post.categories?.map((cat) => cat.name) || [],
        status: post.status || "draft",
        published_at: post.published_at || "",
      };

      const hasChanges =
        formData.title !== originalData.title ||
        formData.summary !== originalData.summary ||
        formData.content !== originalData.content ||
        formData.header_image !== originalData.header_image ||
        JSON.stringify(formData.tags) !== JSON.stringify(originalData.tags) ||
        JSON.stringify(formData.categories) !== JSON.stringify(originalData.categories) ||
        formData.status !== originalData.status ||
        formData.published_at !== originalData.published_at;

      setIsDirty(hasChanges);
    }
  }, [formData, post]);

  // ✅ Validation des champs
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est obligatoire";
    } else if (formData.title.length < 3) {
      newErrors.title = "Le titre doit contenir au moins 3 caractères";
    } else if (formData.title.length > 255) {
      newErrors.title = "Le titre ne peut pas dépasser 255 caractères";
    }

    if (!formData.summary.trim()) {
      newErrors.summary = "Le résumé est obligatoire";
    } else if (formData.summary.length < 10) {
      newErrors.summary = "Le résumé doit contenir au moins 10 caractères";
    } else if (formData.summary.length > 500) {
      newErrors.summary = "Le résumé ne peut pas dépasser 500 caractères";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Le contenu est obligatoire";
    } else if (formData.content.length < 10) {
      newErrors.content = "Le contenu doit contenir au moins 10 caractères";
    }

    if (
      formData.header_image &&
      !formData.header_image.match(/^(https?:\/\/.+|data:image\/.+)/)
    ) {
      newErrors.header_image = "L'URL de l'image doit être valide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Gérer les changements de champs
  const handleFieldChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ✅ Ajouter un tag
  const handleAddTag = () => {
    if (!newTag.trim()) return;

    const tag = newTag.trim();
    if (!formData.tags.includes(tag)) {
      handleFieldChange("tags", [...formData.tags, tag]);
    }
    setNewTag("");
  };

  // ✅ Supprimer un tag
  const handleRemoveTag = (tagToRemove: string) => {
    handleFieldChange(
      "tags",
      formData.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  // ✅ CORRECTION : Ajouter une catégorie avec validation
  const handleAddCategory = (categoryName: string) => {
    if (!categoryName || categoryName.trim() === "" || formData.categories.includes(categoryName)) {
      return;
    }

    handleFieldChange("categories", [...formData.categories, categoryName]);
  };

  // ✅ Supprimer une catégorie
  const handleRemoveCategory = (categoryToRemove: string) => {
    handleFieldChange(
      "categories",
      formData.categories.filter((cat) => cat !== categoryToRemove)
    );
  };

  // ✅ Sauvegarder les modifications
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    if (!post) return;

    try {
      setSaving(true);

      // ✅ CORRECTION : Gestion simple des images (comme ProfileAvatar)
      const updateData: any = {
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        content: convertTextToHtml(formData.content.trim()),
        // ✅ NOUVELLE LOGIQUE : Comme ProfileAvatar, envoyer l'URL telle quelle
        header_image: formData.header_image.trim() || undefined,
        tags: formData.tags,
        categories: formData.categories,
      };

      // ✅ Ajouter le statut et la date si modifiés
      if (post.status !== "published") {
        updateData.status = formData.status;

        // Si statut = scheduled, la date est obligatoire
        if (formData.status === "scheduled") {
          if (!formData.published_at) {
            toast.error("La date de publication est obligatoire pour un post programmé");
            setSaving(false);
            return;
          }
          updateData.published_at = new Date(formData.published_at).toISOString();
        } else if (formData.status === "published") {
          // Si on publie maintenant, définir la date à maintenant
          updateData.published_at = new Date().toISOString();
        } else {
          // Si brouillon, pas de date
          updateData.published_at = null;
        }
      }

      console.log("🔍 [DEBUG] Données envoyées au backend:", updateData);

      // ✅ CORRECTION CRITIQUE : Séparer la mise à jour du contenu et du statut
      // 1. D'abord, mettre à jour le contenu (titre, summary, content, etc.)
      const contentUpdateData = {
        title: updateData.title,
        summary: updateData.summary,
        content: updateData.content,
        header_image: updateData.header_image,
        tags: updateData.tags,
        categories: updateData.categories
      };

      let updatedPost = await blogService.updateBlogPost(
        Number(post.id),
        contentUpdateData
      );

      // 2. Si le statut a changé, utiliser l'API changeStatus séparément
      if (updateData.status && post.status !== updateData.status) {
        console.log(`🔄 [STATUS] Changement de statut: ${post.status} → ${updateData.status}`);

        if (updateData.status === 'scheduled') {
          // Pour scheduled, envoyer la date complète (le service extraira date et heure)
          const scheduledDateTime = new Date(formData.published_at).toISOString();

          console.log(`📅 [SCHEDULED] DateTime envoyé: ${scheduledDateTime}`);

          updatedPost = await blogService.changeStatus(
            Number(post.id),
            'scheduled',
            scheduledDateTime
          );
        } else {
          // Pour draft ou published
          updatedPost = await blogService.changeStatus(
            Number(post.id),
            updateData.status
          );
        }
      }

      const adaptedPost = adaptBlogPostForFrontend(updatedPost);

      setPost(adaptedPost);
      setIsDirty(false);

      toast.success("Article mis à jour avec succès");

      // ✅ Redirection vers la page du blog après sauvegarde
      setTimeout(() => {
        navigate(`/user-blogs/${adaptedPost.slug}`);
      }, 1000);
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      
      // ✅ NOUVEAU : Afficher l'erreur de validation du backend
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.errors || error.response?.data?.message;
        console.error("❌ Erreurs de validation backend:", validationErrors);
        
        // ✅ Message d'erreur spécifique plus user-friendly
        if (validationErrors?.header_image) {
          toast.error("Problème avec l'image. Veuillez réessayer ou utiliser une URL d'image.");
        } else {
          toast.error("Erreur de validation. Veuillez vérifier vos données.");
        }
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving(false);
    }
  };

  // ✅ Prévisualiser l'article
  const handlePreview = () => {
    if (!post) return;
    window.open(`/user-blogs/${post.slug}`, "_blank");
  };

  // ✅ Obtenir la date de création
  const getCreatedDate = () => {
    if (!post) return "";
    const date = post.created_at || new Date().toISOString();
    return format(new Date(date), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  // ✅ Obtenir l'auteur
  const getAuthor = () => {
    if (!post) return "Anonyme";
    return post.user?.name || "Anonyme";
  };

  // ✅ Loading
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de l'article...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-4">Article non trouvé</h1>
            <Button onClick={() => navigate("/mon-actualite")}>
              Retour à la liste
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* ✅ Header avec actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/mon-actualite")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Modifier l'article</h1>
              <p className="text-muted-foreground text-sm">
                Créé le {getCreatedDate()} par {getAuthor()}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!post.slug}
            >
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ✅ Alerte si des changements non sauvegardés */}
        {isDirty && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous avez des modifications non sauvegardées.
            </AlertDescription>
          </Alert>
        )}

        {/* ✅ Informations non modifiables */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informations de l'article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">ID</Label>
                <p className="font-medium">{post.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Slug</Label>
                <p className="font-medium">{post.slug}</p>
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "draft" | "scheduled" | "published") => {
                    setFormData({ ...formData, status: value });
                    setIsDirty(true);
                  }}
                  disabled={post.status === "published"}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Choisir un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="scheduled">Programmé</SelectItem>
                    <SelectItem value="published">Publier maintenant</SelectItem>
                  </SelectContent>
                </Select>
                {post.status === "published" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Les posts publiés ne peuvent pas changer de statut
                  </p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Type</Label>
                <Badge
                  variant={
                    post.is_ai_generated
                      ? "outline"
                      : "default"
                  }
                >
                  {post.is_ai_generated
                    ? "Généré par IA"
                    : "Manuel"}
                </Badge>
              </div>
            </div>

            {/* Champ de date de publication pour les posts programmés */}
            {formData.status === "scheduled" && post.status !== "published" && (
              <div className="pt-3 border-t">
                <Label htmlFor="published_at">Date de publication</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={formData.published_at ? new Date(formData.published_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    setFormData({ ...formData, published_at: e.target.value });
                    setIsDirty(true);
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Le post sera publié automatiquement à cette date
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-sm pt-2 border-t">
              <div>
                <Label className="text-muted-foreground">Vues</Label>
                <p className="font-medium">{post.views || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Likes</Label>
                <p className="font-medium">{post.likes || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Commentaires</Label>
                <p className="font-medium">
                  {typeof post.comments === "number"
                    ? post.comments || 0
                    : Array.isArray(post.comments) 
                    ? post.comments.length 
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Formulaire d'édition */}
        <div className="space-y-6">
          {/* Titre */}
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="Titre de votre article..."
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Résumé */}
          <div>
            <Label htmlFor="summary">Résumé *</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => handleFieldChange("summary", e.target.value)}
              placeholder="Résumé de votre article..."
              rows={3}
              className={errors.summary ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.summary.length}/500 caractères
            </p>
            {errors.summary && (
              <p className="text-red-500 text-sm mt-1">{errors.summary}</p>
            )}
          </div>

          {/* ✅ SIMPLIFICATION : Utilisation du composant BlogImageUpload */}
          <div>
            <Label htmlFor="header_image">Image d'en-tête</Label>
            <div className="space-y-3">
              {/* ✅ Input URL pour les utilisateurs qui préfèrent coller une URL */}
              <Input
                id="header_image"
                type="url"
                value={formData.header_image}
                onChange={(e) => handleFieldChange("header_image", e.target.value)}
                placeholder="https://example.com/image.jpg ou utilisez le bouton d'upload ci-dessous"
                className={errors.header_image ? "border-red-500" : ""}
              />
              
              {/* ✅ Composant d'upload réutilisable */}
              <BlogImageUpload
                currentImage={formData.header_image}
                onUploadSuccess={(path, fullUrl) => {
                  handleFieldChange('header_image', fullUrl)
                }}
                onRemove={() => handleFieldChange('header_image', '')}
                buttonText="Uploader une image d'en-tête"
                className="mt-2"
              />

              <p className="text-xs text-muted-foreground">
                📷 <strong>Options :</strong> Collez une URL dans le champ ci-dessus ou utilisez le bouton d'upload.
                <br />
                💡 <strong>Astuce :</strong> Pour des URLs permanentes, utilisez <a href="https://imgur.com/" target="_blank" className="text-blue-500 underline">Imgur</a> ou <a href="https://imgbb.com/" target="_blank" className="text-blue-500 underline">ImgBB</a>.
              </p>
            </div>
            {errors.header_image && (
              <p className="text-red-500 text-sm mt-1">{errors.header_image}</p>
            )}
          </div>

          {/* Contenu avec RichTextEditor */}
          <div>
            <Label htmlFor="content">Contenu *</Label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => handleFieldChange("content", value)}
              placeholder="Contenu de votre article..."
              className={errors.content ? "border-red-500" : ""}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Utilisez la barre d'outils pour formater votre contenu (titres, gras, italique, listes, liens, etc.)
            </p>
            {errors.content && (
              <p className="text-red-500 text-sm mt-1">{errors.content}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ajouter un tag..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* ✅ CORRECTION : Catégories avec validation Select */}
          <div>
            <Label>Catégories</Label>
            <div className="space-y-2">
              {availableCategories.length > 0 ? (
                <Select onValueChange={handleAddCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCategories ? (
                      <SelectItem value="loading" disabled>
                        Chargement...
                      </SelectItem>
                    ) : (
                      availableCategories
                        .filter((cat) => 
                          cat.name && 
                          cat.name.trim() !== "" && 
                          !formData.categories.includes(cat.name)
                        )
                        .map((category) => (
                          <SelectItem 
                            key={category.id} 
                            value={category.name}
                          >
                            {category.name}
                          </SelectItem>
                        ))
                    )}
                    {!loadingCategories && 
                     availableCategories.filter(cat => 
                       cat.name && 
                       cat.name.trim() !== "" && 
                       !formData.categories.includes(cat.name)
                     ).length === 0 && (
                      <SelectItem value="no-categories" disabled>
                        Aucune catégorie disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 text-sm text-muted-foreground bg-muted rounded-md">
                  {loadingCategories ? "Chargement des catégories..." : "Aucune catégorie disponible"}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {formData.categories.map((category) => (
                  <Badge
                    key={category}
                    variant="default"
                    className="flex items-center gap-1"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(category)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Actions finales */}
        <div className="flex justify-end gap-2 mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => navigate("/mon-actualite")}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les modifications
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserBlogPostEdit;