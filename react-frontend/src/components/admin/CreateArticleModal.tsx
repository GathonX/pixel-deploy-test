import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Loader2 } from 'lucide-react';
import { adminBlogService, CreateBlogPostData, User, AdminBlogPost } from '@/services/adminBlogService';
import { toast } from 'react-toastify';

interface CreateArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  article?: AdminBlogPost | null; // Pour l'édition
  isEditing?: boolean;
}

export const CreateArticleModal: React.FC<CreateArticleModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  article = null, 
  isEditing = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<CreateBlogPostData>({
    title: '',
    summary: '',
    content: '',
    header_image: '',
    tags: [],
    categories: [],
    status: 'draft',
    author_id: undefined
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Charger les utilisateurs et initialiser le formulaire
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      if (isEditing && article) {
        console.log('🔧 Editing article:', article);
        console.log('🔧 Article user_id:', article.user_id);
        setFormData({
          title: article.title,
          summary: article.summary,
          content: article.content,
          header_image: article.header_image || '',
          tags: article.tags || [],
          categories: article.categories?.map(cat => cat.name) || [],
          status: article.status,
          author_id: article.user_id
        });
        setImagePreview(article.header_image || '');
        console.log('🔧 FormData initialisé avec author_id:', article.user_id);
      } else {
        resetForm();
      }
    }
  }, [isOpen, isEditing, article]);

  // Effet séparé pour vérifier que l'author_id est bien défini
  useEffect(() => {
    if (isEditing && article && users.length > 0) {
      console.log('🔧 Users chargés, vérification author_id:', {
        articleUserId: article.user_id,
        formDataAuthorId: formData.author_id,
        usersCount: users.length
      });
      
      // Si l'author_id n'est pas défini mais que l'article a un user_id, le corriger
      if (!formData.author_id && article.user_id) {
        console.log('🔧 Correction author_id manquant');
        setFormData(prev => ({
          ...prev,
          author_id: article.user_id
        }));
      }
    }
  }, [users, isEditing, article, formData.author_id]);

  const loadUsers = async () => {
    try {
      const usersList = await adminBlogService.getUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      content: '',
      header_image: '',
      tags: [],
      categories: [],
      status: 'draft',
      author_id: undefined
    });
    setImagePreview('');
    setCurrentTag('');
    setCurrentCategory('');
  };

  const handleInputChange = (field: keyof CreateBlogPostData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const result = await adminBlogService.uploadImage(file);
      setFormData(prev => ({ ...prev, header_image: result.url }));
      setImagePreview(result.url);
      toast.success('Image uploadée avec succès');
    } catch (error) {
      console.error('Erreur upload image:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      const newTags = [...(formData.tags || []), currentTag.trim()];
      setFormData(prev => ({ ...prev, tags: newTags }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = formData.tags?.filter(tag => tag !== tagToRemove) || [];
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

  const addCategory = () => {
    if (currentCategory.trim() && !formData.categories?.includes(currentCategory.trim())) {
      const newCategories = [...(formData.categories || []), currentCategory.trim()];
      setFormData(prev => ({ ...prev, categories: newCategories }));
      setCurrentCategory('');
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    const newCategories = formData.categories?.filter(cat => cat !== categoryToRemove) || [];
    setFormData(prev => ({ ...prev, categories: newCategories }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.summary || !formData.content) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // 🔍 DEBUG LOGS
    console.log('🔧 FormData avant soumission:', formData);
    console.log('🔧 Article original:', article);
    console.log('🔧 Users disponibles:', users);

    try {
      setLoading(true);
      
      if (isEditing && article) {
        console.log('🔧 Modification article ID:', article.id);
        await adminBlogService.updateArticle(article.id, formData);
        toast.success('Article modifié avec succès');
      } else {
        console.log('🔧 Création nouvel article');
        await adminBlogService.createArticle(formData);
        toast.success('Article créé avec succès');
      }
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erreur sauvegarde article:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'article' : 'Créer un nouvel article'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifiez les informations de cet article de blog.' 
              : 'Créez un nouvel article de blog. Vous pouvez le créer pour vous-même ou pour un autre utilisateur.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Titre */}
            <div className="md:col-span-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Titre de l'article..."
                required
              />
            </div>

            {/* Auteur */}
            <div>
              <Label htmlFor="author">Auteur</Label>
              <Select
                value={formData.author_id?.toString() || ''}
                onValueChange={(value) => {
                  const newAuthorId = value ? parseInt(value) : undefined;
                  console.log('🔧 Changement auteur:', { value, newAuthorId });
                  handleInputChange('author_id', newAuthorId);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un auteur" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 🔍 DEBUG INFO */}
              <div className="text-xs text-gray-500 mt-1">
                Debug: author_id = {formData.author_id || 'undefined'} | Users: {users.length}
              </div>
            </div>

            {/* Statut */}
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value as 'draft' | 'scheduled' | 'published')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publier immédiatement</SelectItem>
                  <SelectItem value="scheduled">Programmer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Résumé */}
          <div>
            <Label htmlFor="summary">Résumé *</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              placeholder="Résumé de l'article..."
              rows={3}
              required
            />
          </div>

          {/* Image d'en-tête */}
          <div>
            <Label>Image d'en-tête</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload Image
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <Input
                  placeholder="Ou collez une URL d'image..."
                  value={formData.header_image || ''}
                  onChange={(e) => {
                    handleInputChange('header_image', e.target.value);
                    setImagePreview(e.target.value);
                  }}
                />
              </div>
              {imagePreview && (
                <div className="w-full h-32 bg-muted rounded overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Ajouter un tag..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Catégories */}
          <div>
            <Label>Catégories</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={currentCategory}
                  onChange={(e) => setCurrentCategory(e.target.value)}
                  placeholder="Ajouter une catégorie..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                />
                <Button type="button" variant="outline" onClick={addCategory}>
                  Ajouter
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.categories?.map((category, index) => (
                  <Badge key={index} variant="default" className="flex items-center gap-1">
                    {category}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeCategory(category)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div>
            <Label htmlFor="content">Contenu *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Contenu de l'article..."
              rows={10}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Modification...' : 'Création...'}
                </>
              ) : (
                isEditing ? 'Modifier l\'article' : 'Créer l\'article'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};