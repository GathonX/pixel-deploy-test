

import React, { useState, useEffect } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users2, 
  FileEdit, 
  Globe, 
  Calendar as CalendarIcon, 
  KeyRound, 
  BarChart3, 
  CreditCard, 
  HelpCircle,
  MessageCircle,
  ClipboardList,
  Settings,
  User,
  Bot,
  ChevronDown,
  PanelLeft,
  Menu,
  BellRing,
  X,
  File,
  Folder,
  Pen,
  BookOpen,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Twitter,
  Instagram,
  Filter,
  Linkedin,
  Loader2,
  RefreshCw
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { calendarService, CalendarPost } from "@/services/calendarService";
import { toast } from "sonner";
import api from "@/services/api";

interface CalendarReservation {
  id: number;
  name: string;
  date: string; // Y-m-d
  guests: number;
  status: string;
}

const CalendarContent = () => {
  // États de base
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("facebook");
  const { toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  
  // États pour les données API
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    byPlatform: {} as Record<string, number>
  });

 // ✅ CORRECTION : Gérer le drag & drop
const handleDragEnd = async (result: DropResult) => {
  const { source, destination, draggableId } = result;
  
  if (!destination) return;
  
  // Extraire les informations
  const postId = parseInt(draggableId.replace('post-', ''));
  const newDay = parseInt(destination.droppableId.replace('day-', ''));
  
  if (source.droppableId === destination.droppableId) return; // Même position
  
  try {
    // ✅ CORRECTION : Créer la nouvelle date correctement
    const newDate = new Date(year, month, newDay);
    
    // ✅ CORRECTION : Conserver l'heure existante si le post en a une
    const originalPost = posts.find(p => p.id === postId);
    let finalDateTime = newDate;
    
    if (originalPost && originalPost.scheduled_time) {
      // Extraire l'heure de l'ancien post
      const oldDate = new Date(originalPost.scheduled_date);
      finalDateTime = new Date(year, month, newDay, oldDate.getHours(), oldDate.getMinutes());
    }
    
    console.log(`📅 Déplacement post ${postId} vers ${finalDateTime.toDateString()}`);
    console.log(`📅 Date finale avec heure: ${finalDateTime.toISOString()}`);
    
    // Mettre à jour via l'API avec la date/heure complète
    await calendarService.movePost(postId, finalDateTime);
    
    toast.success(`Post déplacé vers le ${newDay} juillet !`);
    
    // Recharger le calendrier
    await loadCalendarData();
    
  } catch (error) {
    console.error("❌ Erreur déplacement:", error);
    toast.error("Erreur lors du déplacement du post");
  }
};

  // ✅ NOUVEAU : Gérer le clic sur l'icône
  const handlePostClick = (postId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/social-media/post/${postId}`);
  };

  // Chargement initial des données
  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      console.log("📅 Chargement données calendrier", { year, month });

      // Charger les posts du mois
      const monthPosts = await calendarService.getPostsForMonth(year, month);
      setPosts(monthPosts);

      // Charger les réservations du mois
      try {
        const resRes = await api.get(`/reservations/calendar?year=${year}&month=${month}`);
        setReservations(resRes.data?.data ?? []);
      } catch {
        setReservations([]);
      }

      // Charger les statistiques
      const monthStats = await calendarService.getCalendarStats(year, month);
      setStats(monthStats);

      console.log("✅ Données calendrier chargées", {
        postsCount: monthPosts.length,
        stats: monthStats
      });

    } catch (error) {
      console.error("❌ Erreur chargement calendrier:", error);
      toast.error("Erreur lors du chargement du calendrier");
    } finally {
      setLoading(false);
    }
  };

  const refreshCalendar = async () => {
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
    toast.success("Calendrier actualisé");
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

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

  // Fonction pour récupérer les posts d'un jour spécifique et plateforme
  const getPostsForDay = (day: number, platform: string) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      return postDate.getDate() === day && 
             postDate.getMonth() === month && 
             postDate.getFullYear() === year && 
             post.platform === platform;
    });
  };

  // Fonction pour récupérer tous les posts d'un jour
  const getAllPostsForDay = (day: number) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduled_date);
      return postDate.getDate() === day &&
             postDate.getMonth() === month &&
             postDate.getFullYear() === year;
    });
  };

  // Fonction pour récupérer les réservations d'un jour
  const getReservationsForDay = (day: number): CalendarReservation[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.filter(r => r.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  // Fonction pour obtenir l'icône de plateforme
  const getPlatformIcon = (platform: string) => {
    const icons = {
      facebook: Facebook,
      instagram: Instagram,
      twitter: Twitter,
      linkedin: Linkedin,
    };
    return icons[platform.toLowerCase() as keyof typeof icons] || Facebook;
  };

  // Fonction pour obtenir la couleur de plateforme
  const getPlatformColor = (platform: string) => {
    const colors = {
      facebook: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
      instagram: { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-200" },
      twitter: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
      linkedin: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    };
    return colors[platform.toLowerCase() as keyof typeof colors] || colors.facebook;
  };

  // Filtrer les posts par plateforme pour les onglets
  const getPostsByPlatform = (platform: string) => {
    return posts.filter(post => post.platform === platform);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <SidebarInset className="bg-gray-50">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Chargement du calendrier...</p>
            </div>
          </div>
        </SidebarInset>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-screen w-full">
        <SidebarInset className="bg-gray-50">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden mr-2" 
                  onClick={() => setOpenMobile(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold">Calendrier Social Media</h1>
              </div>
             
            </div>

            {/* Statistiques du mois */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Posts</p>
                      <p className="text-2xl font-bold">{stats.totalPosts}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Programmés</p>
                      <p className="text-2xl font-bold text-orange-600">{stats.scheduledPosts}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Publiés</p>
                      <p className="text-2xl font-bold text-green-600">{stats.publishedPosts}</p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Plateformes</p>
                      <p className="text-2xl font-bold">{Object.keys(stats.byPlatform).length}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/dashboard/reservations')}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Réservations</p>
                      <p className="text-2xl font-bold text-purple-600">{reservations.length}</p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                  Réseaux Sociaux
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/blog-calendar">Blog</Link>
                </Button>
              </div>
              
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

              <div className="flex space-x-3 items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-orange-300"></div>
                  <span className="text-sm text-gray-600">Programmé</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-300"></div>
                  <span className="text-sm text-gray-600">Publié</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                  <span className="text-sm text-gray-600">Réservations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">💡 Glissez-déposez les icônes pour changer la date</span>
                </div>
              </div>
            </div>

            {/* ✅ CALENDRIER AVEC DRAG & DROP */}
            <div className="mb-6">
              <div className="grid grid-cols-7 border rounded-t-md">
                {daysOfWeek.map((day, idx) => (
                  <div key={idx} className="p-2 text-center font-medium border-r last:border-r-0 border-b bg-gray-100">
                    {day}
                  </div>
                ))}
                
                {calendarDays.map((week, weekIdx) => (
                  <React.Fragment key={weekIdx}>
                    {week.map((day, dayIdx) => {
                      const dayPosts = day ? getAllPostsForDay(day) : [];
                      const dayReservations = day ? getReservationsForDay(day) : [];

                      return (
                        <Droppable 
                          key={dayIdx} 
                          droppableId={day ? `day-${day}` : `empty-${weekIdx}-${dayIdx}`} 
                          isDropDisabled={!day}
                        >
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`border-r border-b last:border-r-0 p-2 min-h-24 transition-colors ${
                                day === null ? 'bg-gray-50' :
                                isToday(day) ? 'bg-blue-50' : 'bg-white'
                              } ${
                                snapshot.isDraggingOver ? 'bg-blue-100 border-blue-300 border-2' : ''
                              }`}
                            >
                              {day && (
                                <>
                                  <div className="font-medium text-gray-900 mb-2">{day}</div>
                                  <div className="grid grid-cols-3 gap-1">
                                    {dayPosts.slice(0, 6).map((post, idx) => {
                                      const Icon = getPlatformIcon(post.platform);
                                      const colors = getPlatformColor(post.platform);
                                      
                                      return (
                                        <Draggable 
                                          key={post.id} 
                                          draggableId={`post-${post.id}`} 
                                          index={idx}
                                        >
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`relative flex items-center justify-center w-6 h-6 rounded-full ${colors.bg} ${colors.border} border cursor-pointer hover:scale-110 transition-transform ${
                                                snapshot.isDragging ? 'shadow-lg rotate-6 scale-110' : ''
                                              }`}
                                              title={`${post.platform}: ${post.content.substring(0, 50)}... (${post.status}) - Cliquez pour voir le détail`}
                                              onClick={(e) => handlePostClick(post.id, e)}
                                            >
                                              <Icon className={`h-3 w-3 ${colors.text}`} />
                                              {/* ✅ Point de statut */}
                                              <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                                                post.status === 'published' ? 'bg-green-400' : 
                                                post.status === 'scheduled' ? 'bg-orange-400' : 'bg-gray-400'
                                              }`}></div>
                                            </div>
                                          )}
                                        </Draggable>
                                      );
                                    })}
                                    {/* ✅ Indicateur s'il y a plus de posts */}
                                    {dayPosts.length > 6 && (
                                      <div className="col-span-3 text-xs text-gray-500 text-center bg-gray-100 rounded px-1 py-0.5">
                                        +{dayPosts.length - 6}
                                      </div>
                                    )}
                                  </div>

                                  {/* 🗓️ Réservations du jour */}
                                  {dayReservations.length > 0 && (
                                    <div
                                      className="mt-1 flex items-center gap-1 cursor-pointer hover:opacity-75"
                                      title={`${dayReservations.length} réservation${dayReservations.length > 1 ? 's' : ''} : ${dayReservations.map(r => r.name).join(', ')}`}
                                      onClick={() => navigate('/dashboard/reservations')}
                                    >
                                      <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                                      <span className="text-xs text-purple-600 font-medium leading-none">
                                        {dayReservations.length} rés.
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            {/* Liste détaillée par plateforme */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <Button variant="outline" size="sm" className="w-fit flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtres par plateforme
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="facebook" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="flex w-full border-b mb-4">
                    <TabsTrigger 
                      value="facebook" 
                      className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                    >
                      <Facebook className="h-4 w-4" />
                      Facebook ({stats.byPlatform.facebook || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="twitter"
                      className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-sky-400"
                    >
                      <Twitter className="h-4 w-4" />
                      Twitter ({stats.byPlatform.twitter || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="instagram"
                      className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-pink-500"
                    >
                      <Instagram className="h-4 w-4" />
                      Instagram ({stats.byPlatform.instagram || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="linkedin"
                      className="flex items-center gap-2 data-[state=active]:border-b-2 data-[state=active]:border-blue-700"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn ({stats.byPlatform.linkedin || 0})
                    </TabsTrigger>
                   
                  </TabsList>
                  
                  {['facebook', 'twitter', 'instagram', 'linkedin'].map(platform => (
                    <TabsContent key={platform} value={platform}>
                      <div>
                        <h3 className="text-lg font-medium mb-4">
                          Publications programmées - {platform.charAt(0).toUpperCase() + platform.slice(1)} - {format(currentDate, "MMMM yyyy", { locale: fr })}
                        </h3>
                        
                        {getPostsByPlatform(platform).filter(p => p.status === 'scheduled').length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            {getPostsByPlatform(platform)
                              .filter(p => p.status === 'scheduled')
                              .map(post => {
                                const Icon = getPlatformIcon(post.platform);
                                const colors = getPlatformColor(post.platform);
                                
                                return (
                                  <div 
                                    key={post.id} 
                                    className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => navigate(`/social-media/post/${post.id}`)}
                                  >
                                    <div className="flex items-start space-x-4">
                                      <Icon className={`h-5 w-5 ${colors.text} mt-1`} />
                                      <div className="flex-1">
                                        <div className="font-medium">{post.content}</div>
                                        <div className="text-sm text-gray-500">
                                          Programmé pour {calendarService.formatDate(post.scheduled_date)}
                                          {post.scheduled_time && `, ${post.scheduled_time}`}
                                        </div>
                                        {post.tags && post.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {post.tags.slice(0, 3).map((tag, idx) => (
                                              <Badge key={idx} variant="secondary" className="text-xs">
                                                {tag}
                                              </Badge>
                                            ))}
                                            {post.tags.length > 3 && (
                                              <Badge variant="outline" className="text-xs">
                                                +{post.tags.length - 3}
                                              </Badge>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                                        Programmé
                                      </Badge>
                                      <Button variant="ghost" size="icon">
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            Aucune publication programmée pour {platform}
                          </div>
                        )}
                        
                        <h3 className="text-lg font-medium mt-8 mb-4">
                          Publications publiées - {platform.charAt(0).toUpperCase() + platform.slice(1)} - {format(currentDate, "MMMM yyyy", { locale: fr })}
                        </h3>
                        
                        {getPostsByPlatform(platform).filter(p => p.status === 'published').length > 0 ? (
                          <div className="border rounded-md overflow-hidden">
                            {getPostsByPlatform(platform)
                              .filter(p => p.status === 'published')
                              .map(post => {
                                const Icon = getPlatformIcon(post.platform);
                                const colors = getPlatformColor(post.platform);
                                
                                return (
                                  <div 
                                    key={post.id} 
                                    className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => navigate(`/social-media/post/${post.id}`)}
                                  >
                                    <div className="flex items-start space-x-4">
                                      <Icon className={`h-5 w-5 ${colors.text} mt-1`} />
                                      <div className="flex-1">
                                        <div className="font-medium">{post.content}</div>
                                        <div className="text-sm text-gray-500">
                                          Publié le {calendarService.formatDate(post.scheduled_date)}
                                          {post.scheduled_time && ` à ${post.scheduled_time}`}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                        Publié
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            Aucune publication publiée pour {platform}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground">
              © 2025 Pixelrise. Tous droits réservés.
            </div>
          </div>
        </SidebarInset>
      </div>
    </DragDropContext>
  );
};

const CalendarPage = () => {
  return (
    <DashboardLayout>
      <CalendarContent />
    </DashboardLayout>
  );
};

export default CalendarPage;