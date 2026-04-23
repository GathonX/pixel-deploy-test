import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Heart, Reply, MoreHorizontal, Loader2, Send, MessageSquare, Edit, EyeOff, Trash2, Ban, Flag, Archive } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ✅ NOUVEAU : Imports des services backend
import { interactionService } from "@/services/interactionService";
import { Comment, Author, adaptCommentForFrontend } from "@/data/blogData";
import { getUniformAvatarUrl } from "@/hooks/useProfileListener"; // ✅ IMPORT UNIFORME

interface CommentSectionProps {
  comments: Comment[];
  postId: string;
  currentUser?: Author;
  // ✅ NOUVEAU : Props pour le type de post
  postType?: 'blog_post' | 'social_media_post';
  onCommentsUpdate?: (newCount: number) => void; // ✅ Callback pour mettre à jour le compteur parent
  onAuthorClick?: (authorId: number | string) => void;
}

export function CommentSection({ 
  comments: initialComments, 
  postId, 
  currentUser,
  postType = 'blog_post',
  onCommentsUpdate,
  onAuthorClick 
}: CommentSectionProps) {
  // ✅ NOUVEAU : Hook de navigation
  const navigate = useNavigate();

  // ✅ NOUVEAU : Fonction pour gérer le clic sur l'auteur
  const handleAuthorClick = (authorId: number | string) => {
    if (onAuthorClick) {
      onAuthorClick(authorId);
    } else {
      navigate(`/blog/author/${authorId}`);
    }
  };

  // ✅ NOUVEAU : États pour les données backend
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  // ✅ PRÉSERVÉ : États existants
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [commentContent, setCommentContent] = useState("");

  // ✅ NOUVEAU : États pour les réactions
  const [likedComments, setLikedComments] = useState<Set<string | number>>(new Set());
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});

  // ✅ CORRECTION : Charger les commentaires depuis le backend avec validation
  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoadingComments(true);
        
        const backendComments = await interactionService.getComments(postType, Number(postId), {
          per_page: 50
        });
        
        // ✅ CORRECTION : Vérifier que backendComments est bien un array
        if (!Array.isArray(backendComments)) {
          console.warn('🔍 [DEBUG] Backend comments n\'est pas un array:', backendComments);
          setComments(initialComments); // Fallback vers les commentaires initiaux
          return;
        }
        
        // ✅ Adapter les commentaires backend pour le frontend
        const adaptedComments = backendComments.map(adaptCommentForFrontend);
        setComments(adaptedComments);
        
        // ✅ CORRECTION : Initialiser les compteurs de likes avec les vraies données
        const likeCounts: Record<string, number> = {};
        const userLiked = new Set<string | number>();
        
        adaptedComments.forEach(comment => {
          const commentId = comment.id.toString();
          likeCounts[commentId] = comment.likes_count || comment.likes || 0;
          
          // ✅ Traiter les réponses aussi
          if (comment.replies && Array.isArray(comment.replies)) {
            comment.replies.forEach(reply => {
              const replyId = reply.id.toString();
              likeCounts[replyId] = reply.likes_count || reply.likes || 0;
            });
          }
        });
        
        setCommentLikes(likeCounts);
        
        // ✅ NOUVEAU : Charger les réactions utilisateur pour tous les commentaires
        if (currentUser) {
          try {
            // Charger les réactions utilisateur pour chaque commentaire
            for (const comment of adaptedComments) {
              try {
                const userReactions = await interactionService.getUserReactions('comment', Number(comment.id));
                if (userReactions.has_liked) {
                  userLiked.add(comment.id);
                }
                
                // Charger pour les réponses aussi
                if (comment.replies && Array.isArray(comment.replies)) {
                  for (const reply of comment.replies) {
                    try {
                      const replyReactions = await interactionService.getUserReactions('comment', Number(reply.id));
                      if (replyReactions.has_liked) {
                        userLiked.add(reply.id);
                      }
                    } catch (replyError) {
                      console.warn('Erreur réactions réponse:', replyError);
                    }
                  }
                }
              } catch (commentError) {
                console.warn('Erreur réactions commentaire:', commentError);
              }
            }
            
            setLikedComments(userLiked);
          } catch (reactionsError) {
            console.warn('Erreur chargement réactions:', reactionsError);
          }
        }

        console.log(`✅ ${adaptedComments.length} commentaires chargés depuis le backend`);

      } catch (error) {
        console.error('Erreur chargement commentaires:', error);
        // ✅ CORRECTION : Garder les commentaires initiaux en cas d'erreur
        setComments(Array.isArray(initialComments) ? initialComments : []);
      } finally {
        setLoadingComments(false);
      }
    };

    if (postId && postType) {
      loadComments();
    }
  }, [postId, postType, currentUser]);

  // ✅ NOUVEAU : Soumettre un nouveau commentaire
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentContent.trim() || !currentUser || submittingComment) {
      return;
    }

    try {
      setSubmittingComment(true);
      
      const newComment = await interactionService.createComment({
        commentable_type: postType,
        commentable_id: Number(postId),
        content: commentContent.trim()
      });

      const adaptedComment = adaptCommentForFrontend(newComment);
      
      // ✅ Ajouter le nouveau commentaire en haut de la liste
      setComments(prevComments => [adaptedComment, ...prevComments]);
      setCommentContent("");
      
      // ✅ CORRECTION : Mettre à jour le compteur de likes avec 0
      setCommentLikes(prev => ({
        ...prev,
        [adaptedComment.id.toString()]: 0
      }));

      // ✅ Notifier le parent de la mise à jour
      if (onCommentsUpdate) {
        onCommentsUpdate(comments.length + 1);
      }

      toast.success("Commentaire ajouté avec succès");

    } catch (error) {
      console.error('Erreur création commentaire:', error);
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setSubmittingComment(false);
    }
  };

  // ✅ NOUVEAU : Soumettre une réponse à un commentaire
  const handleSubmitReply = async (parentCommentId: string, e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim() || !currentUser || submittingReply) {
      return;
    }

    try {
      setSubmittingReply(parentCommentId);
      
      const newReply = await interactionService.createComment({
        commentable_type: postType,
        commentable_id: Number(postId),
        content: replyContent.trim(),
        parent_id: Number(parentCommentId)
      });

      const adaptedReply = adaptCommentForFrontend(newReply);
      
      // ✅ Ajouter la réponse au commentaire parent
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id.toString() === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), adaptedReply]
            };
          }
          return comment;
        })
      );

      setShowReplyForm(null);
      setReplyContent("");
      
      // ✅ CORRECTION : Mettre à jour le compteur de likes avec 0
      setCommentLikes(prev => ({
        ...prev,
        [adaptedReply.id.toString()]: 0
      }));

      toast.success("Réponse ajoutée avec succès");

    } catch (error) {
      console.error('Erreur création réponse:', error);
      toast.error("Erreur lors de l'ajout de la réponse");
    } finally {
      setSubmittingReply(null);
    }
  };

  // ✅ CORRECTION : Gérer les likes de commentaires avec synchronisation état
  const handleToggleCommentLike = async (commentId: string | number) => {
    if (!currentUser) {
      toast.error("Connectez-vous pour aimer les commentaires");
      return;
    }

    const commentIdStr = commentId.toString();
    const wasLiked = likedComments.has(commentId);

    try {
      // ✅ OPTIMISATION : Mise à jour optimiste de l'UI
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });

      // ✅ Mise à jour optimiste du compteur
      setCommentLikes(prev => {
        const currentCount = prev[commentIdStr] || 0;
        return {
          ...prev,
          [commentIdStr]: wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1
        };
      });

      const result = await interactionService.toggleReaction({
        reactable_type: 'comment',
        reactable_id: Number(commentId),
        type: 'like'
      });

      // ✅ CORRECTION : Synchroniser avec la réponse du serveur
      const isLiked = result.action === 'added';
      
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(commentId);
        } else {
          newSet.delete(commentId);
        }
        return newSet;
      });

      setCommentLikes(prev => ({
        ...prev,
        [commentIdStr]: result.new_count
      }));

      toast.success(isLiked ? "Commentaire aimé" : "Like retiré");

    } catch (error) {
      console.error('Erreur toggle like commentaire:', error);
      
      // ✅ ROLLBACK : Annuler la mise à jour optimiste en cas d'erreur
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(commentId);
        } else {
          newSet.delete(commentId);
        }
        return newSet;
      });

      setCommentLikes(prev => {
        const currentCount = prev[commentIdStr] || 0;
        return {
          ...prev,
          [commentIdStr]: wasLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
        };
      });

      toast.error("Erreur lors de l'action");
    }
  };

  // ✅ NOUVEAU : États pour la modification de commentaires
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // ✅ IMPLÉMENTÉ : Gérer les actions du menu trois points pour les commentaires
  const handleEditComment = (commentId: string | number, currentContent: string) => {
    setEditingCommentId(commentId.toString());
    setEditContent(currentContent);
  };

  const handleSaveEdit = async (commentId: string | number) => {
    if (!editContent.trim()) {
      toast.error("Le commentaire ne peut pas être vide");
      return;
    }

    try {
      await interactionService.updateComment(Number(commentId), editContent.trim());

      // Mettre à jour le commentaire dans l'état local
      setComments(prevComments =>
        prevComments.map(comment => {
          if (comment.id.toString() === commentId.toString()) {
            return { ...comment, content: editContent.trim() };
          }
          // Vérifier aussi dans les réponses
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id.toString() === commentId.toString()
                  ? { ...reply, content: editContent.trim() }
                  : reply
              )
            };
          }
          return comment;
        })
      );

      setEditingCommentId(null);
      setEditContent("");
      toast.success("✏️ Commentaire modifié avec succès");
    } catch (error) {
      console.error('Erreur modification commentaire:', error);
      toast.error("❌ Erreur lors de la modification du commentaire");
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleHideComment = async (commentId: string | number) => {
    try {
      await interactionService.hideComment(Number(commentId));

      // Retirer le commentaire de l'affichage local
      setComments(prevComments =>
        prevComments.filter(comment => {
          if (comment.id.toString() === commentId.toString()) {
            return false;
          }
          // Filtrer aussi dans les réponses
          if (comment.replies) {
            comment.replies = comment.replies.filter(reply =>
              reply.id.toString() !== commentId.toString()
            );
          }
          return true;
        })
      );

      toast.success("👁️ Commentaire masqué de votre fil");
    } catch (error) {
      console.error('Erreur masquage commentaire:', error);
      toast.error("❌ Erreur lors du masquage du commentaire");
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      return;
    }

    try {
      await interactionService.deleteComment(Number(commentId));

      // Retirer le commentaire de l'état local
      setComments(prevComments =>
        prevComments.filter(comment => {
          if (comment.id.toString() === commentId.toString()) {
            return false;
          }
          // Filtrer aussi dans les réponses
          if (comment.replies) {
            comment.replies = comment.replies.filter(reply =>
              reply.id.toString() !== commentId.toString()
            );
          }
          return true;
        })
      );

      // Mettre à jour le compteur
      if (onCommentsUpdate) {
        onCommentsUpdate(comments.length - 1);
      }

      toast.success("🗑️ Commentaire supprimé avec succès");
    } catch (error) {
      console.error('Erreur suppression commentaire:', error);
      toast.error("❌ Erreur lors de la suppression du commentaire");
    }
  };

  const handleBlockProfile = async (authorId: number | string, authorName: string) => {
    if (!confirm(`Bloquer ${authorName} ? Vous ne pourrez plus voir ses publications ni le contacter.`)) {
      return;
    }

    try {
      await interactionService.blockUser(Number(authorId));
      toast.success(`🚫 ${authorName} a été bloqué avec succès`);
    } catch (error) {
      console.error('Erreur blocage utilisateur:', error);
      toast.error("❌ Erreur lors du blocage de l'utilisateur");
    }
  };

  const handleReportComment = async (commentId: string | number, authorName: string) => {
    const reason = prompt(`Pourquoi signalez-vous ce commentaire de ${authorName} ?\n\nRaisons possibles:\n- Spam\n- Contenu inapproprié\n- Harcèlement\n- Autre`);

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await interactionService.reportComment(Number(commentId), reason.trim());
      toast.success(`🚩 Commentaire de ${authorName} signalé. Notre équipe va l'examiner.`);
    } catch (error) {
      console.error('Erreur signalement commentaire:', error);
      toast.error("❌ Erreur lors du signalement du commentaire");
    }
  };

  const handleBlockCommentAuthor = async (authorId: number | string, authorName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir bloquer ${authorName} ? Vous ne pourrez plus voir ses publications.`)) {
      return;
    }

    try {
      await interactionService.blockUser(Number(authorId));
      toast.success(`🚫 ${authorName} a été bloqué avec succès`);
    } catch (error) {
      console.error('Erreur blocage utilisateur:', error);
      toast.error("❌ Erreur lors du blocage de l'utilisateur");
    }
  };

  // ✅ PRÉSERVÉ + AMÉLIORÉ : Fonction de formatage de date
  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
  };

  // ✅ UNIFORME : Obtenir l'auteur d'un commentaire avec avatar uniforme
  const getCommentAuthor = (comment: Comment) => {
    if (comment.user) {
      const displayName = (comment.user.id === 1 || comment.user.name === 'Admin') ? 'PixelRise' : comment.user.name;
      return {
        id: comment.user.id,
        name: displayName,
        avatar: getUniformAvatarUrl(comment.user.avatar), // ✅ UTILISE FONCTION UNIFORME
        initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }
    if (comment.author) {
      const displayName = (comment.author.id === 1 || comment.author.name === 'Admin') ? 'PixelRise' : comment.author.name;
      return {
        id: comment.author.id,
        name: displayName,
        avatar: getUniformAvatarUrl(comment.author.avatar), // ✅ UTILISE FONCTION UNIFORME
        initials: displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }
    return {
      id: 'anonymous',
      name: 'Anonyme',
      avatar: getUniformAvatarUrl(null), // ✅ UTILISE FONCTION UNIFORME
      initials: 'AN'
    };
  };

  // ✅ NOUVEAU : Obtenir la date du commentaire
  const getCommentDate = (comment: Comment): string => {
    return comment.created_at || comment.date || new Date().toISOString();
  };

  // ✅ CORRECTION : Obtenir le nombre de likes d'un commentaire avec synchronisation
  const getCommentLikesCount = (comment: Comment): number => {
    const commentIdStr = comment.id.toString();
    const storedCount = commentLikes[commentIdStr];
    
    // ✅ Priorité : État local > Backend > Fallback
    if (storedCount !== undefined) return storedCount;
    return comment.likes_count || comment.likes || 0;
  };

  // ✅ UNIFORME : Fonction pour obtenir l'avatar de l'utilisateur actuel
  const getCurrentUserAvatar = () => {
    if (!currentUser) return getUniformAvatarUrl(null);
    return getUniformAvatarUrl(currentUser.avatar);
  };

  // ✅ NOUVEAU : Obtenir les initiales de l'utilisateur actuel
  const getCurrentUserInitials = () => {
    if (!currentUser) return 'AN';
    return currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // ✅ PRÉSERVÉ + AMÉLIORÉ : Fonction de rendu des commentaires avec avatar uniforme
  const renderComment = (comment: Comment, isReply = false) => {
    const author = getCommentAuthor(comment);
    const likesCount = getCommentLikesCount(comment);
    const isLiked = likedComments.has(comment.id);

    return (
      <div key={comment.id} className={`${isReply ? "ml-12 mt-4 border-l-2 border-muted pl-4" : "mb-8 border-b pb-4"}`}>
        <div className="flex gap-4">
          {/* ✅ Avatar avec image correcte */}
          <div
            className="h-10 w-10 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-brand-blue/50 transition-all duration-200 rounded-full overflow-hidden"
            onClick={() => handleAuthorClick(author.id)}
          >
            <img
              src={author.avatar}
              alt={author.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name);
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 
                    className="font-semibold text-sm cursor-pointer hover:text-brand-blue transition-colors duration-200"
                    onClick={() => handleAuthorClick(author.id)}
                  >
                    {author.name}
                  </h4>
                  {!isReply && (
                    <Badge variant="outline" className="text-xs">
                      Commentaire
                    </Badge>
                  )}
                  {isReply && (
                    <Badge variant="secondary" className="text-xs">
                      Réponse
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(getCommentDate(comment))}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[9999]">
                  {currentUser?.id?.toString() === author.id?.toString() ? (
                    <>
                      {/* Menu pour ses propres commentaires */}
                      <DropdownMenuItem onClick={() => handleEditComment(comment.id, comment.content)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleHideComment(comment.id)}>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Masquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteComment(comment.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleBlockProfile(author.id, author.name)}>
                        <Ban className="h-4 w-4 mr-2" />
                        Bloquer le profil
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/contenus-masques')}>
                        <Archive className="h-4 w-4 mr-2" />
                        Voir contenus masqués
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      {/* Menu pour les commentaires des autres */}
                      <DropdownMenuItem className="text-orange-600" onClick={() => handleReportComment(comment.id, author.name)}>
                        <Flag className="h-4 w-4 mr-2" />
                        Signaler
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleHideComment(comment.id)}>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Masquer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleBlockCommentAuthor(author.id, author.name)}>
                        <Ban className="h-4 w-4 mr-2" />
                        Bloquer {author.name}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/contenus-masques')}>
                        <Archive className="h-4 w-4 mr-2" />
                        Voir contenus masqués
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2">
              {editingCommentId === comment.id.toString() ? (
                // Mode édition
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px] text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={!editContent.trim()}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                // Mode lecture
                <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
              )}
            </div>

            <div className="mt-3 flex gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-8 text-xs transition-colors ${isLiked ? "text-red-600 bg-red-50 hover:bg-red-100" : "hover:text-red-600 hover:bg-red-50"}`}
                onClick={() => handleToggleCommentLike(comment.id)}
                disabled={!currentUser}
              >
                <Heart className={`h-3 w-3 mr-1 transition-all ${isLiked ? "fill-current text-red-600" : ""}`} /> 
                {likesCount} J'aime
              </Button>

              {!isReply && currentUser && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setShowReplyForm(showReplyForm === comment.id.toString() ? null : comment.id.toString())}
                >
                  <Reply className="h-3 w-3 mr-1" /> Répondre
                </Button>
              )}

              {/* ✅ NOUVEAU : Indicateur de réponses */}
              {!isReply && comment.replies && comment.replies.length > 0 && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* ✅ UNIFORME : Formulaire de réponse avec avatar correct */}
            {showReplyForm === comment.id.toString() && currentUser && (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => handleSubmitReply(comment.id.toString(), e)}
              >
                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full overflow-hidden">
                    <img
                      src={getCurrentUserAvatar()}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name);
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Textarea 
                      placeholder={`Répondre à ${author.name}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="min-h-[80px] text-sm"
                      disabled={submittingReply === comment.id.toString()}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowReplyForm(null);
                      setReplyContent("");
                    }}
                    disabled={submittingReply === comment.id.toString()}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    size="sm"
                    disabled={!replyContent.trim() || submittingReply === comment.id.toString()}
                  >
                    {submittingReply === comment.id.toString() ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-1" />
                        Répondre
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ✅ PRÉSERVÉ : Rendu des réponses */}
        {comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-10">
      {/* ✅ NOUVEAU : Header avec compteur en temps réel */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">
          Commentaires ({loadingComments ? '...' : comments.length})
        </h3>
        {loadingComments && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* ✅ UNIFORME : Formulaire de commentaire avec avatar correct */}
      {currentUser ? (
        <form className="mb-8" onSubmit={handleSubmitComment}>
          <div className="flex gap-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden">
              <img
                src={getCurrentUserAvatar()}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name);
                }}
              />
            </div>
            <div className="flex-1">
              <Textarea 
                placeholder="Partagez votre avis sur cet article..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                className="min-h-[100px]"
                disabled={submittingComment}
              />
              <div className="mt-3 flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Commentez de manière constructive et respectueuse
                </p>
                <Button 
                  type="submit"
                  disabled={!commentContent.trim() || submittingComment}
                >
                  {submittingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Commenter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 border rounded-md bg-muted/50 text-center">
          <p className="mb-2">Connectez-vous pour participer à la discussion</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/login'}>
              Se connecter
            </Button>
            <Button onClick={() => window.location.href = '/register'}>
              S'inscrire
            </Button>
          </div>
        </div>
      )}

      {/* ✅ NOUVEAU : Liste des commentaires avec états de chargement */}
      {loadingComments ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Chargement des commentaires...</p>
          </div>
        </div>
      ) : Array.isArray(comments) && comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            Aucun commentaire pour le moment
          </p>
          <p className="text-sm text-muted-foreground">
            Soyez le premier à commenter cet article !
          </p>
        </div>
      )}

      {/* ✅ NOUVEAU : Bouton "Charger plus" si nécessaire */}
      {Array.isArray(comments) && comments.length >= 50 && (
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => toast.info("Fonctionnalité à venir")}>
            Charger plus de commentaires
          </Button>
        </div>
      )}
    </div>
  );
}