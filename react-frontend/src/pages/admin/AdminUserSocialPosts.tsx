import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/services/api";
import {
  ArrowLeft,
  Trash2,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface SocialPost {
  id: number;
  platform: string;
  content: string;
  status: string;
  created_at: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

interface Purchase {
  access_id: number;
  feature_name: string;
  status: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  posts_count: number;
  posts: SocialPost[];
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

const AdminUserSocialPosts: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<UserData | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccessId, setSelectedAccessId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePostModalOpen, setDeletePostModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  useEffect(() => {
    fetchSocialPosts();
  }, [userId]);

  const fetchSocialPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}/social-posts`);

      if (response.data.success) {
        setUser(response.data.data.user);
        setPurchases(response.data.data.purchases);
      }
    } catch (error: any) {
      console.error("Erreur récupération social posts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les posts sociaux",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!selectedAccessId) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/admin/features/purchase/${selectedAccessId}`);

      if (response.data.success) {
        toast({
          title: "Achat supprimé",
          description: `${response.data.data.deleted_counts.social_posts} posts supprimés`,
        });

        // Rafraîchir la liste
        fetchSocialPosts();
        setDeleteModalOpen(false);
      }
    } catch (error: any) {
      console.error("Erreur suppression achat:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'achat",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setSelectedAccessId(null);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPostId) return;

    try {
      setDeletingPost(true);
      const response = await api.delete(`/admin/social-posts/${selectedPostId}`);

      if (response.data.success) {
        toast({
          title: "Post supprimé",
          description: "Le post social a été supprimé avec succès",
        });

        // Rafraîchir la liste
        fetchSocialPosts();
        setDeletePostModalOpen(false);
      }
    } catch (error: any) {
      console.error("Erreur suppression post:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le post",
        variant: "destructive",
      });
    } finally {
      setDeletingPost(false);
      setSelectedPostId(null);
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: "bg-blue-500",
      instagram: "bg-pink-500",
      twitter: "bg-sky-500",
      linkedin: "bg-blue-700",
    };
    return colors[platform] || "bg-gray-500";
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-500">Actif</Badge>;
    }
    if (status === "expired") {
      return <Badge variant="destructive">Expiré</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Social Media Posts</h1>
              <p className="text-muted-foreground">
                Utilisateur: {user?.name} ({user?.email})
              </p>
            </div>
          </div>
        </div>

        {/* Liste des achats */}
        {purchases.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Aucun achat de fonctionnalité Social Media pour cet utilisateur
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <Card key={purchase.access_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        ACH-{purchase.access_id} - {purchase.feature_name}
                        {getStatusBadge(purchase.status, purchase.is_active)}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Acheté le:{" "}
                          {new Date(purchase.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        {purchase.expires_at && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            Expire le:{" "}
                            {new Date(purchase.expires_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{purchase.posts_count} posts</Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedAccessId(purchase.access_id);
                          setDeleteModalOpen(true);
                        }}
                        disabled={purchase.is_active}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer ACH-{purchase.access_id}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {purchase.posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun post pour cet achat
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {purchase.posts.map((post) => (
                        <div
                          key={post.id}
                          className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={getPlatformColor(post.platform)}>
                                  {post.platform}
                                </Badge>
                                <Badge variant="outline">{post.status}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  #{post.id}
                                </span>
                              </div>
                              <p className="text-sm line-clamp-2">{post.content}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>👁️ {post.views || 0} vues</span>
                                <span>❤️ {post.likes || 0} likes</span>
                                <span>💬 {post.comments || 0} commentaires</span>
                                <span>🔄 {post.shares || 0} partages</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString("fr-FR")}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPostId(post.id);
                                  setDeletePostModalOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de confirmation de suppression d'achat */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer l'achat ACH-{selectedAccessId}
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Tous les posts sociaux associés à cet
                achat seront définitivement supprimés.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePurchase}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmation de suppression de post individuel */}
        <Dialog open={deletePostModalOpen} onOpenChange={setDeletePostModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Supprimer le post #{selectedPostId}
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Ce post social sera définitivement supprimé.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletePostModalOpen(false)}
                disabled={deletingPost}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePost}
                disabled={deletingPost}
              >
                {deletingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer le post
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUserSocialPosts;
