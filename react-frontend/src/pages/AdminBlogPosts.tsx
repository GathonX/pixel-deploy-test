import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CreateArticleModal } from "@/components/admin/CreateArticleModal";
import { BlogPostViewModal } from "@/components/admin/BlogPostViewModal";
import { BlogCommentsModal } from "@/components/admin/BlogCommentsModal";
import { AdminBlogPostsTable } from "@/components/admin/AdminBlogPostsTable";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Filter, Search, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  adminBlogService,
  AdminBlogPost,
  AdminBlogStatistics,
  User,
} from "@/services/adminBlogService";
import { toast } from "react-toastify";

const AdminBlogPosts: React.FC = () => {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [statistics, setStatistics] = useState<AdminBlogStatistics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<AdminBlogPost | null>(null);
  const [viewingPostId, setViewingPostId] = useState<number | null>(null);
  const [commentsPost, setCommentsPost] = useState<{
    id: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        loadData();
      },
      searchTerm ? 500 : 0,
    );

    return () => clearTimeout(timeoutId);
  }, [currentPage, statusFilter, authorFilter, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);

      const filters = {
        page: currentPage,
        per_page: 15,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        user_id: authorFilter !== "all" ? parseInt(authorFilter) : undefined,
        search: searchTerm || undefined,
      };

      const [articlesResponse, statsResponse, usersResponse] = await Promise.all([
        adminBlogService.getArticles(filters).catch((err) => {
          console.error("Articles error:", err);
          return {
            success: true,
            data: {
              data: [],
              current_page: 1,
              last_page: 1,
              per_page: 15,
              total: 0,
            },
          };
        }),
        adminBlogService.getStatistics().catch((err) => {
          console.error("Stats error:", err);
          return {
            total_posts: 0,
            published_posts: 0,
            draft_posts: 0,
            scheduled_posts: 0,
            total_views: 0,
            total_likes: 0,
            total_shares: 0,
            authors_count: 0,
            categories_count: 0,
            recent_posts: [],
            most_viewed: [],
          };
        }),
        adminBlogService.getUsers().catch((err) => {
          console.error("Users error:", err);
          return [];
        }),
      ]);

      setPosts(articlesResponse.data.data);
      setTotalPages(articlesResponse.data.last_page);
      setStatistics(statsResponse);
      setUsers(usersResponse);
    } catch (error: any) {
      console.error("Erreur chargement données:", error);
      toast.error(
        `Erreur: ${error.message || "Erreur lors du chargement des données"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: number, title: string) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer l'article "${title}" ?`,
      )
    ) {
      try {
        await adminBlogService.deleteArticle(id);
        toast.success("Article supprimé avec succès");
        loadData();
      } catch (error) {
        console.error("Erreur suppression:", error);
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const handleFilterChange = (
    type: "search" | "status" | "author",
    value: string,
  ) => {
    switch (type) {
      case "search":
        setSearchTerm(value);
        break;
      case "status":
        setStatusFilter(value);
        break;
      case "author":
        setAuthorFilter(value);
        break;
    }
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestion du Blog</h1>
            <p className="text-muted-foreground">
              Gérer et modérer les articles du blog
            </p>
            {statistics && (
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>Total: {statistics.total_posts}</span>
                <span>Publiés: {statistics.published_posts}</span>
                <span>Brouillons: {statistics.draft_posts}</span>
                <span>Vues: {statistics.total_views}</span>
              </div>
            )}
          </div>
          <Button
            className="mt-4 md:mt-0"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Article
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="overflow-x-auto">
              <TabsList>
                <TabsTrigger value="all">Tous les Articles</TabsTrigger>
                <TabsTrigger value="published">Publiés</TabsTrigger>
                <TabsTrigger value="drafts">Brouillons</TabsTrigger>
                <TabsTrigger value="scheduled">Planifiés</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 w-full sm:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les status</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
                  <SelectItem value="published">Publiés</SelectItem>
                  <SelectItem value="scheduled">Programmés</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={authorFilter}
                onValueChange={(value) => handleFilterChange("author", value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Auteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les auteurs</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : (
                  <AdminBlogPostsTable
                    posts={posts}
                    loading={loading}
                    onViewPost={(id) => setViewingPostId(id)}
                    onEditPost={(post) => setEditingArticle(post)}
                    onDeletePost={handleDeletePost}
                    onViewComments={(id, title) => setCommentsPost({ id, title })}
                  />
                )}
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={
                        currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={currentPage === pageNum}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages)
                          setCurrentPage(currentPage + 1);
                      }}
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>

          <TabsContent value="published">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : (
                  <AdminBlogPostsTable
                    posts={posts.filter((p) => p.status === "published")}
                    loading={loading}
                    onViewPost={(id) => setViewingPostId(id)}
                    onEditPost={(post) => setEditingArticle(post)}
                    onDeletePost={handleDeletePost}
                    onViewComments={(id, title) => setCommentsPost({ id, title })}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : (
                  <AdminBlogPostsTable
                    posts={posts.filter((p) => p.status === "draft")}
                    loading={loading}
                    onViewPost={(id) => setViewingPostId(id)}
                    onEditPost={(post) => setEditingArticle(post)}
                    onDeletePost={handleDeletePost}
                    onViewComments={(id, title) => setCommentsPost({ id, title })}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-muted-foreground">Chargement...</p>
                  </div>
                ) : (
                  <AdminBlogPostsTable
                    posts={posts.filter((p) => p.status === "scheduled")}
                    loading={loading}
                    onViewPost={(id) => setViewingPostId(id)}
                    onEditPost={(post) => setEditingArticle(post)}
                    onDeletePost={handleDeletePost}
                    onViewComments={(id, title) => setCommentsPost({ id, title })}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <CreateArticleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />

        {editingArticle && (
          <CreateArticleModal
            isOpen={!!editingArticle}
            onClose={() => setEditingArticle(null)}
            onSuccess={loadData}
            article={editingArticle}
            isEditing={true}
          />
        )}

        {viewingPostId && (
          <BlogPostViewModal
            isOpen={!!viewingPostId}
            onClose={() => setViewingPostId(null)}
            postId={viewingPostId}
            onEdit={(post) => {
              setViewingPostId(null);
              setEditingArticle(post);
            }}
            onDelete={(postId, title) => {
              setViewingPostId(null);
              handleDeletePost(postId, title);
            }}
            onViewComments={(postId, title) => {
              setViewingPostId(null);
              setCommentsPost({ id: postId, title });
            }}
          />
        )}

        {commentsPost && (
          <BlogCommentsModal
            isOpen={!!commentsPost}
            onClose={() => setCommentsPost(null)}
            postId={commentsPost.id}
            postTitle={commentsPost.title}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBlogPosts;
