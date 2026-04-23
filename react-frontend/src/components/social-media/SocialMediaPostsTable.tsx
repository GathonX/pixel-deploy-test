import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  FileText, 
  Trash2, 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Copy,
  Share2,
  Image as ImageIcon,
  ImageOff
} from "lucide-react";
import { SocialMediaPost } from "@/services/socialMediaService";
import { toast } from "sonner";

interface SocialMediaPostsTableProps {
  filteredPosts: SocialMediaPost[];
  handleDeletePost: (id: number) => void;
}

export const SocialMediaPostsTable: React.FC<SocialMediaPostsTableProps> = ({
  filteredPosts,
  handleDeletePost
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook": return <Facebook className="h-4 w-4 text-blue-500" />;
      case "instagram": return <Instagram className="h-4 w-4 text-pink-500" />;
      case "twitter": return <Twitter className="h-4 w-4 text-blue-400" />;
      case "linkedin": return <Linkedin className="h-4 w-4 text-blue-700" />;
      
      default: return null;
    }
  };

  const handleViewDetail = (postId: number) => {
    navigate(`/social-media/post/${postId}`);
  };

  const handleEditPost = (postId: number) => {
    navigate(`/social-media/post/${postId}/edit`);
  };

  const handleQuickCopy = async (post: SocialMediaPost) => {
    try {
      const fullText = `${post.content}\n\n${post.tags?.join(' ') || ''}`;
      await navigator.clipboard.writeText(fullText);
      toast.success("Post copié dans le presse-papier !");
    } catch (error) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleRowClick = (postId: number, event: React.MouseEvent) => {
    // ✅ CORRECTION : Ignorer les clics sur les boutons, dropdown menus et leurs éléments
    const target = event.target as HTMLElement;
    if (target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('[role="menuitem"]') ||
        target.closest('[data-radix-menu-content]') ||
        target.closest('[data-radix-dropdown-menu]')) {
      return;
    }
    handleViewDetail(postId);
  };

  // ✅ IMAGES DE FALLBACK FONCTIONNELLES
  const getWorkingFallbackImage = (platform: string): string => {
    // Images génériques qui marchent toujours
    const fallbackImages = {
      facebook: "https://picsum.photos/400/400?random=1",
      instagram: "https://picsum.photos/400/400?random=2", 
      twitter: "https://picsum.photos/400/400?random=3",
      linkedin: "https://picsum.photos/400/400?random=4",
      default: "https://picsum.photos/400/400?random=6"
    };
    
    return fallbackImages[platform.toLowerCase() as keyof typeof fallbackImages] || fallbackImages.default;
  };

  // ✅ COMPOSANT CORRIGÉ : Pas de boucle infinie
  const ImagesCell: React.FC<{ images: string[] | null; platform: string }> = ({ images, platform }) => {
    const [imageError, setImageError] = React.useState(false);

    if (!images || images.length === 0) {
      return (
        <div className="flex items-center justify-center text-muted-foreground">
          <ImageOff className="h-4 w-4" />
        </div>
      );
    }

    const handleImageError = () => {
      // ✅ CORRECTION : Éviter la boucle infinie
      if (!imageError) {
        setImageError(true);
      }
    };

    // ✅ CORRECTION : Utiliser directement le fallback si erreur
    const displayImage = imageError ? getWorkingFallbackImage(platform) : images[0];

    return (
      <div className="flex items-center space-x-1">
        <div className="h-8 w-8 rounded overflow-hidden bg-muted flex-shrink-0 relative">
          {imageError ? (
            // ✅ CORRECTION : Fallback statique sans onError
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <ImageIcon className="h-3 w-3 text-brand-blue" />
            </div>
          ) : (
            <img 
              src={displayImage}
              alt="Aperçu"
              className="h-full w-full object-cover"
              onError={handleImageError}
            />
          )}
        </div>
        {images.length > 1 && (
          <Badge variant="secondary" className="text-xs">
            +{images.length - 1}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Contenu</TableHead>
          <TableHead className="w-[100px] text-center">Images</TableHead>
          <TableHead>Plateforme</TableHead>
          <TableHead>Auteur</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-center">Vues</TableHead>
          <TableHead className="text-center">Likes</TableHead>
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <TableRow 
              key={post.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => handleRowClick(post.id, e)}
            >
              <TableCell className="font-medium">
                <div className="min-w-0">
                  <span className="truncate max-w-[200px] block text-sm">
                    {post.content.substring(0, 60)}...
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Cliquer pour voir le détail
                  </span>
                </div>
              </TableCell>
              
              {/* ✅ CORRECTION : Passer la plateforme pour le fallback approprié */}
              <TableCell className="text-center">
                <ImagesCell images={post.images} platform={post.platform} />
              </TableCell>
              
              <TableCell>
                <div className="flex items-center space-x-1">
                  {getPlatformIcon(post.platform)}
                  <span className="ml-1 capitalize">{post.platform}</span>
                </div>
              </TableCell>
              
              <TableCell>{post.user?.name || "Utilisateur"}</TableCell>
              
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {post.tags?.slice(0, 2).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="max-w-[100px] truncate text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {post.tags && post.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{post.tags.length - 2}</Badge>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                {post.status === 'scheduled' && post.published_at
                  ? formatDate(post.published_at)
                  : post.published_at
                    ? formatDate(post.published_at)
                    : formatDate(post.created_at)}
              </TableCell>
              <TableCell className="text-center">{post.views}</TableCell>
              <TableCell className="text-center">{post.likes}</TableCell>
              
              <TableCell className="text-center">
                <Badge variant={post.is_ai_generated ? "outline" : "default"}>
                  {post.is_ai_generated ? "IA" : "Manuel"}
                </Badge>
              </TableCell>
              
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions du post</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => handleViewDetail(post.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir le détail
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => handleQuickCopy(post)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier le contenu
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => handleEditPost(post.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {post.images && post.images.length > 0 && (
                      <DropdownMenuItem onClick={() => toast.info(`${post.images?.length} image(s) disponible(s)`)}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Voir images ({post.images.length})
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem onClick={() => toast.info("Ouvre la page de détail pour plus d'options")}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Publier ailleurs
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => toast.success("Fonctionnalité à venir")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Commentaires
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={10} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground mb-4">Aucune publication trouvée.</p>
                <p className="text-sm text-muted-foreground">Cliquez sur "Générer un post" pour créer votre premier contenu.</p>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};