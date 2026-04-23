import React, { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  BookText,
  Edit,
  Check,
  Clock,
  ArrowRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  PenTool,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSidebar } from "@/components/ui/sidebar";
interface BlogWebsite { id?: string; name?: string; url?: string; [key: string]: unknown; }
import { toast } from "sonner";
import {
  blogCalendarService,
  BlogCalendarPost,
  BlogCalendarStats,
} from "@/services/blogCalendarService";

const BlogCalendarContent = () => {
  // ✅ États de base (PRÉSERVÉS)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("drafts");
  const [defaultBlog, setDefaultBlog] = useState<BlogWebsite | null>(null);
  const navigate = useNavigate();
  const { toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();

  // ✅ NOUVEAUX états pour les vraies données
  const [posts, setPosts] = useState<BlogCalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<BlogCalendarStats>({
    totalPosts: 0,
    draftPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    byStatus: { draft: 0, scheduled: 0, published: 0 },
  });

  // ✅ Effet pour charger le blog par défaut (PRÉSERVÉ)
  useEffect(() => {
    setDefaultBlog(null);
  }, []);

  // ✅ NOUVEAU : Chargement initial des données
  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      console.log("📅 Chargement données calendrier blog", { year, month });

      // Charger les posts du mois
      const monthPosts = await blogCalendarService.getPostsForMonth(
        year,
        month
      );
      setPosts(monthPosts);

      // Charger les statistiques
      const monthStats = await blogCalendarService.getCalendarStats(
        year,
        month
      );
      setStats(monthStats);

      console.log("✅ Données calendrier blog chargées", {
        postsCount: monthPosts.length,
        stats: monthStats,
      });
    } catch (error) {
      console.error("❌ [BlogCalendarPage] Erreur chargement:", error);
      toast.error("Erreur lors du chargement du calendrier blog");
    } finally {
      setLoading(false);
    }
  };

  const refreshCalendar = async () => {
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
    toast.success("Calendrier blog actualisé");
  };

  // ✅ Fonctions de navigation (PRÉSERVÉES)
  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  // ✅ Navigation vers la création d'article
  const goToCreateBlog = () => {
    navigate('/dashboard/blog/create');
  };

  const goToDefaultBlog = () => {
    navigate("/dashboard/default-blog");
  };

  // ✅ Variables pour le calendrier (PRÉSERVÉES)
  const daysOfWeek = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // ✅ Génération du calendrier (PRÉSERVÉE)
  const calendarDays = [];
  let dayCounter = 1;

  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if ((i === 0 && j < firstDay) || dayCounter > daysInMonth) {
        week.push(null);
      } else {
        week.push(dayCounter++);
      }
    }
    calendarDays.push(week);
    if (dayCounter > daysInMonth) break;
  }

  // ✅ MODIFIÉ : Utiliser les vraies données
  const getPostsForDay = (day: number, status?: string) => {
    return blogCalendarService.getPostsForDay(posts, day, month, year, status);
  };

  const isToday = (day: number) => {
    return blogCalendarService.isToday(day, month, year);
  };

  // ✅ NOUVEAU : Affichage de loading
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Chargement du calendrier blog...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Calendrier des Articles</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={goToCreateBlog}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PenTool className="h-4 w-4 mr-2" />
            Créer un article
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={refreshCalendar}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* ✅ Statistiques du mois (NOUVEAU) */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold">{stats.totalPosts}</p>
              </div>
              <BookText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Brouillons</p>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.draftPosts}
                </p>
              </div>
              <Edit className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Programmés</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.scheduledPosts}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Publiés</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.publishedPosts}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 space-y-4">
        {/* ✅ Section blog par défaut (PRÉSERVÉE) */}
        {defaultBlog && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 flex justify-between items-center">
            <div>
              <h2 className="font-medium text-blue-800">
                Blog par défaut: {defaultBlog.title}
              </h2>
              <p className="text-sm text-blue-600">
                Tous les articles programmés dans ce calendrier apparaîtront
                dans votre blog par défaut
              </p>
            </div>
            <Button
              variant="outline"
              onClick={goToDefaultBlog}
              className="flex items-center gap-1"
            >
              Gérer les articles <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ✅ Navigation entre calendriers (PRÉSERVÉE) */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/calendar">Réseaux Sociaux</Link>
          </Button>
          <Button
            variant="default"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Blog
          </Button>
        </div>

        {/* ✅ Navigation mois (PRÉSERVÉE) */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </h2>
            <div className="flex">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ✅ Légende (PRÉSERVÉE) */}
        <div className="flex space-x-3 items-center">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-200"></div>
            <span className="text-sm text-gray-600">Brouillon</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-200"></div>
            <span className="text-sm text-gray-600">Programmé</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-300"></div>
            <span className="text-sm text-gray-600">Publié</span>
          </div>
        </div>
      </div>

      {/* ✅ Calendrier (structure PRÉSERVÉE, données RÉELLES) */}
      <div className="mb-6">
        <div className="grid grid-cols-7 border rounded-t-md">
          {daysOfWeek.map((day, idx) => (
            <div
              key={idx}
              className="p-2 text-center font-medium border-r last:border-r-0 border-b"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((week, weekIdx) => (
            <React.Fragment key={weekIdx}>
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`border-r border-b last:border-r-0 p-2 min-h-24 ${
                    day === null
                      ? "bg-gray-50"
                      : isToday(day)
                      ? "bg-blue-50"
                      : ""
                  }`}
                >
                  {day && (
                    <>
                      <div className="font-medium">{day}</div>
                      {/* ✅ MODIFIÉ : Utiliser les vraies données */}
                      {getPostsForDay(day, "draft").length > 0 && (
                        <div className="mt-1 flex items-center text-xs p-1 bg-gray-50 rounded-md">
                          <Edit className="h-3 w-3 mr-1" />
                          <span className="truncate">
                            {getPostsForDay(day, "draft")[0].title.substring(
                              0,
                              15
                            )}
                            ...
                          </span>
                        </div>
                      )}
                      {getPostsForDay(day, "scheduled").length > 0 && (
                        <div className="mt-1 flex items-center text-xs p-1 bg-blue-50 rounded-md">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="truncate">
                            {getPostsForDay(
                              day,
                              "scheduled"
                            )[0].title.substring(0, 15)}
                            ...
                          </span>
                        </div>
                      )}
                      {getPostsForDay(day, "published").length > 0 && (
                        <div className="mt-1 flex items-center text-xs p-1 bg-green-50 rounded-md">
                          <Check className="h-3 w-3 mr-1" />
                          <span className="truncate">
                            {getPostsForDay(
                              day,
                              "published"
                            )[0].title.substring(0, 15)}
                            ...
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ✅ Sections par onglets (structure PRÉSERVÉE, données RÉELLES) */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <Button
            variant="outline"
            size="sm"
            className="w-fit flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="drafts"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="flex w-full border-b mb-4">
              <TabsTrigger
                value="drafts"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-gray-600"
              >
                <Edit className="h-4 w-4" />
                Brouillons ({stats.draftPosts})
              </TabsTrigger>
              <TabsTrigger
                value="scheduled"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
              >
                <Clock className="h-4 w-4" />
                Programmés ({stats.scheduledPosts})
              </TabsTrigger>
              <TabsTrigger
                value="published"
                className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-green-600"
              >
                <Check className="h-4 w-4" />
                Publiés ({stats.publishedPosts})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drafts">
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Articles en brouillon -{" "}
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </h3>
                {blogCalendarService.getPostsByStatus(posts, "draft").length >
                0 ? (
                  <div className="border rounded-md overflow-hidden">
                    {blogCalendarService
                      .getPostsByStatus(posts, "draft")
                      .map((post) => (
                        <div
                          key={post.id}
                          className="flex items-start justify-between p-4 border-b"
                        >
                          <div className="flex items-start space-x-4">
                            <BookText className="h-5 w-5 text-gray-500 mt-1" />
                            <div>
                              <div className="font-medium">{post.title}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {post.summary
                                  ? post.summary.substring(0, 80) + "..."
                                  : "Aucun résumé"}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Par {post.user?.name || "Auteur inconnu"} •
                                Dernière modification le{" "}
                                {blogCalendarService.formatDate(
                                  post.updated_at
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                              Brouillon
                            </Badge>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucun article en brouillon pour{" "}
                    {format(currentDate, "MMMM yyyy", { locale: fr })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="scheduled">
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Articles programmés -{" "}
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </h3>
                {blogCalendarService.getPostsByStatus(posts, "scheduled")
                  .length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    {blogCalendarService
                      .getPostsByStatus(posts, "scheduled")
                      .map((post) => (
                        <div
                          key={post.id}
                          className="flex items-start justify-between p-4 border-b"
                        >
                          <div className="flex items-start space-x-4">
                            <BookText className="h-5 w-5 text-blue-500 mt-1" />
                            <div>
                              <div className="font-medium">{post.title}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {post.summary
                                  ? post.summary.substring(0, 80) + "..."
                                  : "Aucun résumé"}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Par {post.user?.name || "Auteur inconnu"} •
                                Programmé pour le{" "}
                                {post.published_at
                                  ? blogCalendarService.formatDate(
                                      post.published_at
                                    )
                                  : "Date inconnue"}
                                {post.scheduled_time &&
                                  ` à ${post.scheduled_time}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                              Programmé
                            </Badge>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucun article programmé pour{" "}
                    {format(currentDate, "MMMM yyyy", { locale: fr })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="published">
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Articles publiés -{" "}
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </h3>
                {blogCalendarService.getPostsByStatus(posts, "published")
                  .length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    {blogCalendarService
                      .getPostsByStatus(posts, "published")
                      .map((post) => (
                        <div
                          key={post.id}
                          className="flex items-start justify-between p-4 border-b"
                        >
                          <div className="flex items-start space-x-4">
                            <BookText className="h-5 w-5 text-green-500 mt-1" />
                            <div>
                              <div className="font-medium">{post.title}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {post.summary
                                  ? post.summary.substring(0, 80) + "..."
                                  : "Aucun résumé"}
                              </div>
                              <div className="text-xs text-gray-500 mt-2">
                                Par {post.user?.name || "Auteur inconnu"} •
                                Publié le{" "}
                                {post.published_at
                                  ? blogCalendarService.formatDate(
                                      post.published_at
                                    )
                                  : blogCalendarService.formatDate(
                                      post.created_at
                                    )}
                                {post.scheduled_time &&
                                  ` à ${post.scheduled_time}`}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {post.views} vues • {post.likes} likes •{" "}
                                {post.shares} partages
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Publié
                            </Badge>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Aucun article publié pour{" "}
                    {format(currentDate, "MMMM yyyy", { locale: fr })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        © 2025 Pixelrise. Tous droits réservés.
      </div>
    </div>
  );
};

const BlogCalendarPage = () => {
  return (
    <DashboardLayout>
      <BlogCalendarContent />
    </DashboardLayout>
  );
};

export default BlogCalendarPage;
