import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Plus, X, ImagePlus, Trash2, Save, AlertTriangle, Check } from "lucide-react";
import { SocialMediaPost } from "@/services/socialMediaService";
import { validateForPlatform } from "@/utils/socialPostUtils";

interface SocialPostEditFormProps {
  post: SocialMediaPost;
  onSave: (updates: any) => Promise<void>;
  saving?: boolean;
}

export const SocialPostEditForm: React.FC<SocialPostEditFormProps> = ({
  post,
  onSave,
  saving = false
}) => {
  const [content, setContent] = useState(post.content);
  const [tags, setTags] = useState<string[]>(post.tags || []);
  const [newTag, setNewTag] = useState("");
  const [images, setImages] = useState<string[]>(post.images || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled" | "published">(post.status);

  const validation = validateForPlatform(content + '\n\n' + tags.join(' '), post.platform);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      content: content.trim(),
      tags,
      images,
      categories: tags.map(tag => tag.replace('#', ''))
    };
    
    await onSave(updates);
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

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    
    if (images.includes(newImageUrl)) return;
    
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
  };

  const removeImage = (imageToRemove: string) => {
    setImages(images.filter(img => img !== imageToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Validation du contenu */}
      <Card className={validation.isValid ? "border-green-200" : "border-red-200"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Contenu pour {post.platform}</CardTitle>
            <Badge variant={validation.isValid ? "outline" : "destructive"} className={validation.isValid ? "bg-green-50 text-green-700" : ""}>
              {validation.isValid ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Valide
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Trop long
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Texte du post</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Écrivez votre contenu ici..."
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {validation.currentLength} / {validation.maxLength} caractères
              </span>
              <span className={validation.remaining >= 0 ? "text-green-600" : "text-red-600"}>
                {validation.remaining >= 0 ? `${validation.remaining} restants` : `${Math.abs(validation.remaining)} en trop`}
              </span>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all ${
                  validation.isValid 
                    ? validation.currentLength / validation.maxLength > 0.8 
                      ? "bg-yellow-500" 
                      : "bg-green-500"
                    : "bg-red-500"
                }`}
                style={{ 
                  width: `${Math.min((validation.currentLength / validation.maxLength) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader>
          <CardTitle>Hashtags ({tags.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter un hashtag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <Button
                    type="button"
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
          )}
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Images ({images.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="URL de l'image..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
            />
            <Button type="button" onClick={addImage} size="sm">
              <ImagePlus className="h-4 w-4" />
            </Button>
          </div>
          
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={image} 
                    alt={`Image ${index + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statut */}
      <Card>
        <CardHeader>
          <CardTitle>Statut de publication</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            type="submit" 
            disabled={saving || !validation.isValid}
            className="w-full"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les modifications
              </>
            )}
          </Button>
          
          {!validation.isValid && (
            <p className="text-sm text-red-600 mt-2 text-center">
              Le contenu dépasse la limite de caractères pour {post.platform}
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
};