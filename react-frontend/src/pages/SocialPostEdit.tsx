import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { socialMediaService, SocialMediaPost } from "@/services/socialMediaService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Check,
  ImagePlus,
  Trash2,
  Upload,
  Link,
  FileImage
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PlatformPreview } from "@/components/social-media/PlateformPreview";
import { validateForPlatform } from "@/utils/socialPostUtils";

const SocialPostEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États pour le post
  const [originalPost, setOriginalPost] = useState<SocialMediaPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // États du formulaire
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled" | "published">("draft");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  
  // États UI
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost(parseInt(id));
    }
  }, [id]);

  // Détecter les changements
  useEffect(() => {
    if (!originalPost) return;
    
    const currentData = {
      content,
      tags: tags.sort(),
      images: images.sort(),
      status
    };
    
    const originalData = {
      content: originalPost.content,
      tags: (originalPost.tags || []).sort(),
      images: (originalPost.images || []).sort(),
      status: originalPost.status
    };
    
    const changed = JSON.stringify(currentData) !== JSON.stringify(originalData);
    setHasChanges(changed);
  }, [content, tags, images, status, originalPost]);

  const loadPost = async (postId: number) => {
    try {
      setLoading(true);
      const postData = await socialMediaService.getSocialPost(postId);
      setOriginalPost(postData);
      
      // Initialiser le formulaire
      setContent(postData.content);
      setTags(postData.tags || []);
      setImages(postData.images || []);
      setStatus(postData.status);
      
      if (postData.published_at) {
        const date = new Date(postData.published_at);
        setScheduledDate(format(date, "yyyy-MM-dd"));
        setScheduledTime(format(date, "HH:mm"));
      }
      
    } catch (error) {
      console.error("Erreur chargement post:", error);
      toast.error("Erreur lors du chargement du post");
      navigate("/dashboard/default-social");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!originalPost) return;
    
    try {
      setSaving(true);
      
      const updateData = {
        content: content.trim(),
        tags,
        images,
        categories: tags.map(tag => tag.replace('#', '')) // Convertir tags en catégories
      };
      
      await socialMediaService.updateSocialPost(originalPost.id, updateData);
      
      // ✅ CORRECTION : Mettre à jour le statut si changé
      if (status !== originalPost.status) {
        // ✅ CORRECTION : Construction correcte des options selon le statut
        if (status === 'scheduled') {
          // Pour un statut programmé, vérifier que date et heure sont définies
          if (!scheduledDate || !scheduledTime) {
            toast.error("Date et heure de programmation requises");
            return;
          }
          
          // ✅ CORRECTION : Créer la date/heure complète
          const scheduledDateTime = `${scheduledDate} ${scheduledTime}:00`; // Format: "2025-07-13 12:00:00"
          
          await socialMediaService.changeStatus(originalPost.id, status, scheduledDateTime);
        } else {
          // Pour draft ou published, pas besoin de date
          await socialMediaService.changeStatus(originalPost.id, status);
        }
      }
      
      toast.success("Post mis à jour avec succès !");
      setHasChanges(false);
      
      // Recharger les données
      await loadPost(originalPost.id);
      
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    
    let formattedTag = newTag.trim();
    if (!formattedTag.startsWith('#')) {
      formattedTag = '#' + formattedTag;
    }
    
    if (!tags.includes(formattedTag)) {
      setTags([...tags, formattedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addImageFromUrl = () => {
    if (!newImageUrl.trim()) return;
    
    if (images.includes(newImageUrl)) {
      toast.error("Cette image est déjà ajoutée");
      return;
    }
    
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  // ✅ NOUVEAU : Fonction pour convertir un fichier en base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // ✅ NOUVEAU : Gérer l'upload de fichier
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image valide");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 5MB");
      return;
    }

    try {
      setUploading(true);
      
      // Convertir en base64 pour stockage local
      const base64String = await convertToBase64(file);
      
      // Ajouter à la liste des images
      if (!images.includes(base64String)) {
        setImages([...images, base64String]);
        toast.success("Image ajoutée avec succès !");
      } else {
        toast.error("Cette image est déjà ajoutée");
      }
      
      // Reset du input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'ajout de l'image");
    } finally {
      setUploading(false);
    }
  };

  // ✅ NOUVEAU : Déclencher l'input file
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (imageToRemove: string) => {
    setImages(images.filter(img => img !== imageToRemove));
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      facebook: Facebook,
      instagram: Instagram,
      twitter: Twitter,
      linkedin: Linkedin,
    };
    const Icon = icons[platform.toLowerCase() as keyof typeof icons];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  const getValidation = () => {
    if (!originalPost) return null;
    return validateForPlatform(content + '\n\n' + tags.join(' '), originalPost.platform);
  };

  const validation = getValidation();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du post...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!originalPost) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Post introuvable</h2>
            <p className="text-muted-foreground mb-6">Le post demandé n'existe pas ou a été supprimé.</p>
            <Button onClick={() => navigate("/dashboard/default-social")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux posts
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-md bg-blue-50">
                  {getPlatformIcon(originalPost.platform)}
                </div>
                Modifier le post {originalPost.platform}
              </h1>
              <p className="text-muted-foreground">
                Créé le {format(new Date(originalPost.created_at), "dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Masquer" : "Aperçu"}
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire d'édition */}
          <div className="space-y-6">
            {/* Contenu principal */}
            <Card>
              <CardHeader>
                <CardTitle>Contenu du post</CardTitle>
                {validation && (
                  <div className="flex items-center gap-2">
                    {validation.isValid ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <Check className="h-3 w-3 mr-1" />
                        Valide pour {originalPost.platform}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Trop long pour {originalPost.platform}
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Texte du post</Label>
                  <Textarea
                    id="content"
                    placeholder="Écrivez votre contenu ici..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                  {validation && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{validation.currentLength} caractères</span>
                      <span className={validation.remaining >= 0 ? "text-green-600" : "text-red-600"}>
                        {validation.remaining >= 0 ? `${validation.remaining} restants` : `${Math.abs(validation.remaining)} en trop`}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hashtags */}
            <Card>
              <CardHeader>
                <CardTitle>Hashtags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un hashtag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ✅ MODIFIÉ : Images avec upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Images ({images.length})
                  {/* ✅ NOUVEAU : Toggle mode d'ajout */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={uploadMode === "url" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUploadMode("url")}
                    >
                      <Link className="h-3 w-3 mr-1" />
                      URL
                    </Button>
                    <Button
                      variant={uploadMode === "file" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUploadMode("file")}
                    >
                      <FileImage className="h-3 w-3 mr-1" />
                      Fichier
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ✅ NOUVEAU : Mode URL */}
                {uploadMode === "url" && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="URL de l'image..."
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addImageFromUrl()}
                    />
                    <Button onClick={addImageFromUrl} size="sm">
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* ✅ NOUVEAU : Mode Upload fichier */}
                {uploadMode === "file" && (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={triggerFileUpload}
                      disabled={uploading}
                      className="w-full"
                      variant="outline"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Upload en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Choisir une image depuis l'ordinateur
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Formats supportés : JPG, PNG, GIF, WebP (max 5MB)
                    </p>
                  </div>
                )}
                
                {/* ✅ MODIFIÉ : Affichage des images */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={image} 
                          alt={`Image ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                          onError={(e) => {
                            // Gérer les erreurs d'affichage d'image
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(image)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {/* ✅ NOUVEAU : Indicateur type d'image */}
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 py-0.5 rounded">
                          {image.startsWith('data:') ? 'Fichier' : 'URL'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statut et programmation */}
            <Card>
              <CardHeader>
                <CardTitle>Statut et publication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="scheduled">Programmé</SelectItem>
                      <SelectItem value="published">Publié</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status === 'scheduled' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Date</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Heure</Label>
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Aperçu */}
          {showPreview && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aperçu du post</CardTitle>
                </CardHeader>
                <CardContent>
                  <PlatformPreview
                    post={{
                      ...originalPost,
                      content,
                      tags,
                      images,
                      status
                    }}
                    platform={originalPost.platform}
                  />
                </CardContent>
              </Card>

              {/* Modifications en cours */}
              {hasChanges && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Modifications non sauvegardées</span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      N'oubliez pas de sauvegarder vos modifications.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SocialPostEdit;