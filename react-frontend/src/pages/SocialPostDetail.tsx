import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  socialMediaService,
  SocialMediaPost,
} from "@/services/socialMediaService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Download,
  Share2,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  Edit,
  Trash2,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SocialPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<SocialMediaPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost(parseInt(id));
    }
  }, [id]);

  const loadPost = async (postId: number) => {
    try {
      setLoading(true);
      const postData = await socialMediaService.getSocialPost(postId);
      setPost(postData);
    } catch (error) {
      console.error("Erreur chargement post:", error);
      toast.error("Erreur lors du chargement du post");
      navigate("/dashboard/default-social");
    } finally {
      setLoading(false);
    }
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

  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: "text-blue-600 bg-blue-50",
      instagram: "text-pink-600 bg-pink-50",
      twitter: "text-blue-400 bg-blue-50",
      linkedin: "text-blue-700 bg-blue-50",
    };
    return (
      colors[platform.toLowerCase() as keyof typeof colors] ||
      "text-gray-600 bg-gray-50"
    );
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copié dans le presse-papier !`);
    } catch (error) {
      toast.error("Erreur lors de la copie");
    } finally {
      setCopying(false);
    }
  };

  const copyFullPost = async () => {
    if (!post) return;

    const fullText = `${post.content}\n\n${post.tags?.join(" ") || ""}`;
    await copyToClipboard(fullText, "Post complet");
  };

  const copyHashtags = async () => {
    if (!post?.tags) return;
    await copyToClipboard(post.tags.join(" "), "Hashtags");
  };

  const downloadAsText = () => {
    if (!post) return;

    const content = `${post.content}\n\n${
      post.tags?.join(" ") || ""
    }\n\nGénéré le: ${format(new Date(post.created_at), "dd/MM/yyyy à HH:mm", {
      locale: fr,
    })}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `post-${post.platform}-${post.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Post téléchargé !");
  };

  const exportForPlatform = (platform: string) => {
    if (!post) return;

    const exportUrls = {
      facebook: "https://www.facebook.com/",
      instagram: "https://www.instagram.com/",
      twitter: "https://twitter.com/compose/tweet",
      linkedin: "https://www.linkedin.com/feed/",
    };

    const url = exportUrls[platform.toLowerCase() as keyof typeof exportUrls];
    if (url) {
      // Copier le contenu et ouvrir la plateforme
      copyFullPost();
      window.open(url, "_blank");
      toast.info(`Redirection vers ${platform}. Le contenu a été copié !`);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMMM yyyy 'à' HH:mm", {
      locale: fr,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Brouillon", variant: "secondary" as const },
      scheduled: { label: "Programmé", variant: "outline" as const },
      published: { label: "Publié", variant: "default" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // ✅ CORRIGER : Redirection vers la page d'édition
  const handleEdit = () => {
    navigate(`/social-media/post/${id}/edit`);
  };

  // ✅ NOUVEAU : Fonction pour supprimer le post
  const handleDelete = async () => {
    if (
      !post ||
      !window.confirm("Êtes-vous sûr de vouloir supprimer ce post ?")
    ) {
      return;
    }

    try {
      setDeleting(true);
      await socialMediaService.deleteSocialPost(post.id);
      toast.success("Post supprimé avec succès");
      navigate("/dashboard/default-social");
    } catch (error) {
      console.error("Erreur suppression post:", error);
      toast.error("Erreur lors de la suppression du post");
    } finally {
      setDeleting(false);
    }
  };

  // ✅ NOUVEAU : Fonction pour créer un post similaire
  const handleCreateSimilar = () => {
    if (!post) return;

    // Rediriger vers la page de création avec le contenu pré-rempli
    const queryParams = new URLSearchParams({
      template: "similar",
      platform: post.platform,
      content: post.content,
      tags: post.tags?.join(",") || "",
    });

    navigate(`/dashboard/default-social?${queryParams.toString()}`);
    toast.info("Redirection vers la création d'un post similaire");
  };

  // ✅ NOUVEAU : Fonction pour programmer le post
  const handleSchedule = () => {
    if (!post) return;

    // Rediriger vers la page de programmation/modification
    navigate(`/social-media/post/${id}/edit?mode=schedule`);
  };

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

  if (!post) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Post introuvable</h2>
            <p className="text-muted-foreground mb-6">
              Le post demandé n'existe pas ou a été supprimé.
            </p>
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
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header avec navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/default-social")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Détail du post</h1>
              <p className="text-muted-foreground">
                Post {post.platform} • {formatDate(post.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Aperçu du post */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-md ${getPlatformColor(
                        post.platform
                      )}`}
                    >
                      {getPlatformIcon(post.platform)}
                    </div>
                    Post {post.platform}
                  </CardTitle>
                  {getStatusBadge(post.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Images ({post.images.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {post.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md border"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contenu texte */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contenu
                  </h4>
                  <div className="p-4 bg-gray-50 rounded-md border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {post.content}
                    </p>
                  </div>
                </div>

                {/* Hashtags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Hashtags</h4>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-blue-600"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions de copie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Actions de copie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    onClick={copyFullPost}
                    disabled={copying}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier le post
                  </Button>

                  <Button
                    variant="outline"
                    onClick={copyHashtags}
                    disabled={copying || !post.tags?.length}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copier hashtags
                  </Button>

                  <Button
                    variant="outline"
                    onClick={downloadAsText}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger .txt
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export vers réseaux sociaux */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Publier sur les réseaux
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Le contenu sera copié et la plateforme s'ouvrira dans un
                  nouvel onglet
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      platform: "facebook",
                      label: "Facebook",
                      icon: Facebook,
                      color: "hover:bg-blue-50",
                    },
                    {
                      platform: "instagram",
                      label: "Instagram",
                      icon: Instagram,
                      color: "hover:bg-pink-50",
                    },
                    {
                      platform: "twitter",
                      label: "Twitter",
                      icon: Twitter,
                      color: "hover:bg-blue-50",
                    },
                    {
                      platform: "linkedin",
                      label: "LinkedIn",
                      icon: Linkedin,
                      color: "hover:bg-blue-50",
                    },
                  ].map(({ platform, label, icon: Icon, color }) => (
                    <Button
                      key={platform}
                      variant="outline"
                      onClick={() => exportForPlatform(platform)}
                      className={`w-full flex-col h-16 ${color}`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar informations */}
          <div className="space-y-6">
            {/* Statistiques */}
            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Vues</span>
                  </div>
                  <span className="font-medium">{post.views || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Likes</span>
                  </div>
                  <span className="font-medium">{post.likes || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Commentaires</span>
                  </div>
                  <span className="font-medium">{post.comments || 0}</span>
                </div>

                {post.shares !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Partages</span>
                    </div>
                    <span className="font-medium">{post.shares}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Informations techniques */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Plateforme
                  </label>
                  <p className="capitalize">{post.platform}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Statut
                  </label>
                  <div className="mt-1">{getStatusBadge(post.status)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Type
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={post.is_ai_generated ? "outline" : "default"}
                    >
                      {post.is_ai_generated ? "Généré par IA" : "Manuel"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Créé le
                  </label>
                  <p className="text-sm">{formatDate(post.created_at)}</p>
                </div>

                {post.published_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {post.status === "scheduled"
                        ? "Programmé pour"
                        : "Publié le"}
                    </label>
                    <p className="text-sm">{formatDate(post.published_at)}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Caractères
                  </label>
                  <p className="text-sm">{post.content.length}</p>
                </div>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={copyFullPost}
                  disabled={copying}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier rapidement
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleSchedule}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Programmer
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCreateSimilar}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Créer un similaire
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SocialPostDetail;
