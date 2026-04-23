import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { moderationService } from "@/services/moderationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, MessageCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface HiddenContent {
  id: number;
  user_id: number;
  hideable_type: string;
  hideable_id: number;
  created_at: string;
  hideable?: {
    id: number;
    title?: string;
    content?: string;
    slug?: string;
  };
}

export default function HiddenContentsPage() {
  const [hiddenPosts, setHiddenPosts] = useState<HiddenContent[]>([]);
  const [hiddenComments, setHiddenComments] = useState<HiddenContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    loadHiddenContents();
  }, []);

  const loadHiddenContents = async () => {
    try {
      setLoading(true);
      const [postsData, commentsData] = await Promise.all([
        moderationService.getHiddenContents("blog_post"),
        moderationService.getHiddenContents("comment"),
      ]);
      setHiddenPosts(Array.isArray(postsData) ? postsData : []);
      setHiddenComments(Array.isArray(commentsData) ? commentsData : []);
    } catch (error) {
      console.error("Erreur chargement contenus masqués:", error);
      toast.error("Erreur lors du chargement des contenus masqués");
    } finally {
      setLoading(false);
    }
  };

  const handleUnhidePost = async (item: HiddenContent) => {
    try {
      await moderationService.unhideContent({
        hideable_type: "blog_post",
        hideable_id: item.hideable_id,
      });
      setHiddenPosts((prev) => prev.filter((p) => p.id !== item.id));
      toast.success("📌 Publication affichée à nouveau dans votre fil");
    } catch (error) {
      console.error("Erreur démasquage:", error);
      toast.error("❌ Erreur lors du démasquage de la publication");
    }
  };

  const handleUnhideComment = async (item: HiddenContent) => {
    try {
      await moderationService.unhideContent({
        hideable_type: "comment",
        hideable_id: item.hideable_id,
      });
      setHiddenComments((prev) => prev.filter((c) => c.id !== item.id));
      toast.success("💬 Commentaire affiché à nouveau");
    } catch (error) {
      console.error("Erreur démasquage:", error);
      toast.error("❌ Erreur lors du démasquage du commentaire");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-black mb-2">
            Contenus masqués
          </h1>
          <p className="text-slate-600">
            Gérez vos publications et commentaires masqués
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Publications ({hiddenPosts.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Commentaires ({hiddenComments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {hiddenPosts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600">
                    Aucune publication masquée
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {hiddenPosts.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {item.hideable?.title || "Publication sans titre"}
                          </CardTitle>
                          <Badge variant="secondary">
                            Masqué le{" "}
                            {new Date(item.created_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleUnhidePost(item)}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Afficher à nouveau
                        </Button>
                        {item.hideable?.slug && (
                          <Link to={`/user-blogs/${item.hideable.slug}`}>
                            <Button variant="ghost">Voir la publication</Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments">
            {hiddenComments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600">Aucun commentaire masqué</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {hiddenComments.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm text-slate-600 mb-2">
                            {item.hideable?.content?.substring(0, 150) ||
                              "Commentaire"}
                            {item.hideable?.content &&
                            item.hideable.content.length > 150
                              ? "..."
                              : ""}
                          </p>
                          <Badge variant="secondary">
                            Masqué le{" "}
                            {new Date(item.created_at).toLocaleDateString(
                              "fr-FR"
                            )}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleUnhideComment(item)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Afficher à nouveau
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
