import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { BlogPost } from "@/services/blogService";
import { adaptBlogPostForFrontend } from "@/data/blogData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookText, Edit, Clock, ChevronDown, Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserBlogPostsTable } from "@/components/user-blogs/UserBlogPostsTable";

// ✅ Interface compatible avec l'usage actuel
interface UserBlogPostsTabsProps {
  posts?: BlogPost[];                               // ✅ OPTIONNEL : Posts passés par le parent
  filters?: ReactNode;                             // ✅ Filtres passés par le parent
  children?: ReactNode;                            // ✅ Contenu (comme UserBlogPostsTable)
  handleDeletePost?: (id: string | number) => void; // ✅ Callback suppression
  onPostUpdated?: (updatedPost: BlogPost) => void;  // ✅ Callback mise à jour
  onPostDeleted?: (postId: string | number) => void; // ✅ Callback suppression
}

export function UserBlogPostsTabs({ 
  posts = [],
  filters,
  children,
  handleDeletePost,
  onPostUpdated,
  onPostDeleted
}: UserBlogPostsTabsProps) {
  // ✅ États locaux pour l'interface avec onglets
  const [activeTab, setActiveTab] = useState("all");

  // ✅ Fonction de changement d'onglet
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // ✅ Filtrage par statut
  const drafts = posts.filter(post => post.status === "draft");
  const scheduled = posts.filter(post => post.status === "scheduled");
  const published = posts.filter(post => post.status === "published");

  // ✅ Si children est passé, on utilise la structure simple avec les filtres
  if (children) {
    return (
      <div className="space-y-4">
        {filters}
        <Card>
          <CardContent className="p-0">
            {children}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ✅ Sinon, on utilise la structure avec onglets
  return (
    <Tabs defaultValue="all" className="space-y-4" value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all" className="flex items-center gap-2">
          <BookText className="h-4 w-4" />
          Tous ({posts.length})
        </TabsTrigger>
        <TabsTrigger value="published" className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Publiés ({published.length})
        </TabsTrigger>
        <TabsTrigger value="drafts" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Brouillons ({drafts.length})
        </TabsTrigger>
      </TabsList>

      {/* ✅ Onglet "Tous" avec tableau complet */}
      <TabsContent value="all" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <UserBlogPostsTable 
              filteredPosts={posts}
              handleDeletePost={handleDeletePost}
              onPostUpdated={onPostUpdated}
              onPostDeleted={onPostDeleted}
            />
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* ✅ Onglet Publiés */}
      <TabsContent value="published">
        <Card>
          <CardContent className="p-0">
            {published.length > 0 ? (
              <UserBlogPostsTable 
                filteredPosts={published}
                handleDeletePost={handleDeletePost}
                onPostUpdated={onPostUpdated}
                onPostDeleted={onPostDeleted}
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                Aucun article publié pour le moment
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* ✅ Onglet Brouillons */}
      <TabsContent value="drafts">
        <Card>
          <CardContent className="p-0">
            {drafts.length > 0 ? (
              <UserBlogPostsTable 
                filteredPosts={drafts}
                handleDeletePost={handleDeletePost}
                onPostUpdated={onPostUpdated}
                onPostDeleted={onPostDeleted}
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                Aucun article en brouillon pour le moment
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* ✅ Onglet Programmés */}
      <TabsContent value="scheduled">
        <Card>
          <CardContent className="p-0">
            {scheduled.length > 0 ? (
              <UserBlogPostsTable 
                filteredPosts={scheduled}
                handleDeletePost={handleDeletePost}
                onPostUpdated={onPostUpdated}
                onPostDeleted={onPostDeleted}
              />
            ) : (
              <div className="text-center text-gray-500 py-8">
                Aucun article programmé pour le moment
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}