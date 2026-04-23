import React from "react";
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
  MessageSquare,
  ImageIcon,
  ImageOff
} from "lucide-react";
import { AdminBlogPost } from "@/services/adminBlogService";

interface AdminBlogPostsTableProps {
  posts: AdminBlogPost[];
  loading: boolean;
  onViewPost: (id: number) => void;
  onEditPost: (post: AdminBlogPost) => void;
  onDeletePost: (id: number, title: string) => void;
  onViewComments: (id: number, title: string) => void;
}

export const AdminBlogPostsTable: React.FC<AdminBlogPostsTableProps> = ({
  posts,
  loading,
  onViewPost,
  onEditPost,
  onDeletePost,
  onViewComments
}) => {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
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
    onViewPost(postId);
  };

  const ImageCell: React.FC<{ image: string | null; title: string }> = ({ image, title }) => {
    const [imageError, setImageError] = React.useState(false);

    if (!image) {
      return (
        <div className="flex items-center justify-center text-muted-foreground">
          <ImageOff className="h-4 w-4" />
        </div>
      );
    }

    const handleImageError = () => {
      if (!imageError) {
        setImageError(true);
      }
    };

    return (
      <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
        {imageError ? (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <FileText className="h-4 w-4 text-brand-blue" />
          </div>
        ) : (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            onError={handleImageError}
          />
        )}
      </div>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Titre</TableHead>
          <TableHead>Auteur</TableHead>
          <TableHead>Catégories</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-center">Vues</TableHead>
          <TableHead className="text-center">Commentaires</TableHead>
          <TableHead className="text-center">Likes</TableHead>
          <TableHead className="text-center">Type</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.length > 0 ? (
          posts.map((post) => (
            <TableRow
              key={post.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => handleRowClick(post.id, e)}
            >
              <TableCell className="font-medium">
                <div className="flex items-center space-x-3">
                  <ImageCell image={post.header_image} title={post.title} />
                  <div className="min-w-0">
                    <span className="truncate max-w-[200px] block text-sm">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Cliquer pour voir le détail
                    </span>
                  </div>
                </div>
              </TableCell>

              <TableCell>{post.user.name}</TableCell>

              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {post.categories.slice(0, 2).map((category) => (
                    <Badge
                      key={category.id}
                      variant="secondary"
                      className="max-w-[100px] truncate text-xs"
                    >
                      {category.name}
                    </Badge>
                  ))}
                  {post.categories.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{post.categories.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>

              <TableCell>{formatDate(post.published_at)}</TableCell>
              <TableCell className="text-center">{post.views}</TableCell>
              <TableCell className="text-center">{post.comments_count || 0}</TableCell>
              <TableCell className="text-center">{post.likes}</TableCell>

              <TableCell className="text-center">
                <Badge
                  variant={
                    post.status === "published"
                      ? "default"
                      : post.status === "draft"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {post.status === "published"
                    ? "Publié"
                    : post.status === "draft"
                      ? "Brouillon"
                      : "Programmé"}
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
                    <DropdownMenuLabel>Actions de l'article</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => onViewPost(post.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir l'article
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onEditPost(post)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onViewComments(post.id, post.title)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Commentaires ({post.comments_count || 0})
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onDeletePost(post.id, post.title)}
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
            <TableCell colSpan={9} className="h-24 text-center">
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground mb-4">Aucun article trouvé.</p>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Nouvel Article" pour créer votre premier article.
                </p>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
