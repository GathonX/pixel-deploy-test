import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Trash2, Eye, User, Calendar } from 'lucide-react';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import adminBlogService, { Comment, CommentsData } from '@/services/adminBlogService';

interface BlogCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postTitle: string;
}

export const BlogCommentsModal: React.FC<BlogCommentsModalProps> = ({ 
  isOpen, 
  onClose, 
  postId, 
  postTitle 
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [postStats, setPostStats] = useState<{likes: number, views: number, comments_count: number} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const commentsData = await adminBlogService.getComments(postId);
      
      console.log('🔍 [BlogCommentsModal] Données reçues:', commentsData);
      
      setComments(commentsData.comments || []);
      setPostStats(commentsData.post_stats || null);
    } catch (error: any) {
      console.error('❌ [BlogCommentsModal] Erreur chargement commentaires:', error);
      setComments([]);
      setPostStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      try {
        await adminBlogService.deleteComment(commentId);
        setComments(prev => prev.filter(c => c.id !== commentId));
      } catch (error) {
        console.error('Erreur suppression commentaire:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Commentaires
          </DialogTitle>
          <DialogDescription>
            Gestion des commentaires pour l'article : "{postTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statistiques */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{postStats?.comments_count || comments.length}</div>
                    <div className="text-sm text-muted-foreground">Commentaires</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {comments.reduce((acc, c) => acc + c.likes_count, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Likes commentaires</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {postStats?.likes || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Likes article</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {postStats?.views || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Vues</div>
                  </div>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  Article #{postId}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Liste des commentaires */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={comment.user?.avatar || ''} alt={comment.display_name} />
                        <AvatarFallback>
                          {getUserInitials(comment.display_name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Contenu du commentaire */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{comment.display_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {comment.is_anonymous ? 'Utilisateur anonyme' : comment.user.email}
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              {formatDate(comment.created_at)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {comment.likes_count} ❤️
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Contenu */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  Aucun commentaire
                </div>
                <div className="text-sm text-muted-foreground">
                  Cet article n'a pas encore reçu de commentaires.
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};