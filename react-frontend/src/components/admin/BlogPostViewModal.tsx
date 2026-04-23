import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, FileText, Calendar, User, Heart, Share2, MessageSquare, Clock, Tag } from 'lucide-react';
import { adminBlogService, AdminBlogPost } from '@/services/adminBlogService';
import { toast } from 'react-toastify';
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BlogPostViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  onEdit?: (post: AdminBlogPost) => void;
  onDelete?: (postId: number, title: string) => void;
  onViewComments?: (postId: number, title: string) => void;
}

export const BlogPostViewModal: React.FC<BlogPostViewModalProps> = ({ 
  isOpen, 
  onClose, 
  postId, 
  onEdit, 
  onDelete,
  onViewComments
}) => {
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [loading, setLoading] = useState(false);

  // Charger les détails de l'article
  useEffect(() => {
    if (isOpen && postId) {
      loadPostDetail();
    }
  }, [isOpen, postId]);

  const loadPostDetail = async () => {
    try {
      setLoading(true);
      const postDetail = await adminBlogService.getArticle(postId);
      setPost(postDetail);
    } catch (error: any) {
      console.error('Erreur chargement article:', error);
      toast.error('Erreur lors du chargement de l\'article');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (post && onEdit) {
      onEdit(post);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (post && onDelete) {
      onDelete(post.id, post.title);
      onClose();
    }
  };

  const handleViewComments = () => {
    if (post && onViewComments) {
      onViewComments(post.id, post.title);
      onClose();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      published: 'bg-green-100 text-green-800 border-green-300',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    
    const labels = {
      draft: 'Brouillon',
      published: 'Publié',
      scheduled: 'Programmé'
    };

    return (
      <Badge variant="outline" className={styles[status as keyof typeof styles] || styles.draft}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  };

  if (!post && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto [&>button]:top-4 [&>button]:right-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement de l'article...</p>
            </div>
          </div>
        ) : post ? (
          <>
            {/* Header sans actions */}
            <DialogHeader className="pb-6">
              <div className="pr-8">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusBadge(post.status)}
                  <span className="text-sm text-muted-foreground">Article #{post.id}</span>
                </div>
                <DialogTitle className="text-2xl font-bold leading-tight mb-2">
                  {post.title}
                </DialogTitle>
                <DialogDescription className="text-lg text-muted-foreground">
                  {post.summary}
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* Métadonnées */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{post.user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>{post.likes} likes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                    <span>{post.views} vues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{post.comments_count || 0} commentaires</span>
                  </div>
                </div>

                {post.published_at && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-green-700">
                        Publié le {formatDate(post.published_at)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image d'en-tête */}
            {post.header_image && (
              <div className="mb-6">
                <img 
                  src={post.header_image} 
                  alt={post.title}
                  className="w-full max-h-96 object-cover rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Contenu principal */}
            <div className="mb-6">
              <div 
                className="prose prose-lg max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: formatContent(post.content)
                }}
                style={{
                  fontSize: '16px',
                  lineHeight: '1.7',
                  color: '#374151'
                }}
              />
            </div>

            <Separator className="my-6" />

            {/* Tags et catégories */}
            <div className="space-y-4">
              {post.categories.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Catégories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {post.categories.map((category) => (
                      <Badge key={category.id} variant="secondary" className="px-3 py-1">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {post.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="px-2 py-1">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Informations techniques (pliables) */}
            <details className="mb-4">
              <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                Informations techniques
              </summary>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg text-sm space-y-2">
                <div><strong>Slug:</strong> <code className="text-xs bg-white px-2 py-1 rounded">{post.slug}</code></div>
                <div><strong>ID:</strong> {post.id}</div>
                <div><strong>Dernière modification:</strong> {formatDate(post.updated_at)}</div>
                <div><strong>Génération IA:</strong> {post.is_ai_generated ? 'Oui' : 'Non'}</div>
                {post.scheduled_time && (
                  <div><strong>Programmé pour:</strong> {post.scheduled_time}</div>
                )}
              </div>
            </details>

            {/* Footer avec actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Article consulté en mode admin
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button variant="outline" size="sm" onClick={handleViewComments}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Commentaires
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Article non trouvé</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};