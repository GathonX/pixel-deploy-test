import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Award,
  ExternalLink,
  Globe,
} from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth"; // ✅ CHANGEMENT
import ProfileAvatar from "@/components/ProfileAvatar";
import axios from "axios";
import DeleteAccountCard from "@/components/DeleteAccountCard";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Veuillez entrer une adresse email valide" }),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().max(160).optional(),
  language: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const DEFAULTS = {
  name: "Jean Marie",
  email: "jeanmarie@example.com",
  phone: "+261 34 12 345 67",
  address: "Antananarivo, Madagascar",
  bio: "Passionné de marketing digital et de nouvelles technologies.",
  created_at: Date.now(),
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  // ✅ CHANGEMENT : Utiliser le contexte Auth étendu
  const { user, loading, updateUserProfile, getAvatarUrl } = useAuth();
  
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState(getAvatarUrl());

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: DEFAULTS.name,
      email: DEFAULTS.email,
      phone: DEFAULTS.phone,
      address: DEFAULTS.address,
      bio: DEFAULTS.bio,
    },
  });

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = form;

  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? DEFAULTS.name,
        email: user.email ?? DEFAULTS.email,
        phone: user.phone ?? DEFAULTS.phone,
        address: user.address ?? DEFAULTS.address,
        bio: user.bio ?? DEFAULTS.bio,
        language: user.language ?? "french",
      });
      
      // ✅ NOUVEAU : Utiliser getAvatarUrl du contexte
      setProfileImage(getAvatarUrl(user.avatar));
    }
  }, [user, reset, getAvatarUrl]);

  const onSubmit = handleSubmit(async (values) => {
    const { id, update, dismiss } = toast({
      title: "Mise à jour du profil",
      description: "En cours…",
      variant: "info",
    });

    try {
      const response = await api.put("/profile", {
        ...values,
        language: values.language || "french"
      });

      // ✅ NOUVEAU : Mettre à jour le contexte global avec les nouvelles données
      updateUserProfile({
        ...user!,
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        bio: values.bio,
        language: values.language || "french",
        updated_at: new Date().toISOString()
      });

      update({
        id,
        title: "Profil mis à jour",
        description: "Votre profil a bien été mis à jour.",
        variant: "success",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message ||
          "Erreur lors de la mise à jour du profil.";
        update({
          id,
          title: "Erreur",
          description: msg,
          variant: "destructive",
        });
      } else {
        update({
          id,
          title: "Erreur",
          description: "Erreur inattendue.",
          variant: "destructive",
        });
        console.error(err);
      }
    } finally {
      setTimeout(() => dismiss(), 3000);
    }
  });

  // ✅ NOUVEAU : Fonction pour gérer la mise à jour de l'avatar
  const handleAvatarUpdate = (newPath: string) => {
    const fullUrl = getAvatarUrl(newPath);
    setProfileImage(fullUrl);
    
    // ✅ Mettre à jour le contexte global
    updateUserProfile({
      ...user!,
      avatar: newPath,
      updated_at: new Date().toISOString()
    });
  };


  if (loading) return null;

  const handleChangePassword = () => {
    navigate('/profile/change-password');
  };

  return (
    <SidebarProvider>
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Mon Profil</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne de gauche */}
            <div className="col-span-1">
              <Card>
                <CardHeader className="text-center pb-2">
                  {/* ✅ NOUVEAU : Utiliser handleAvatarUpdate pour synchroniser */}
                  <ProfileAvatar
                    currentPath={user?.avatar ?? ''}
                    onUploadSuccess={handleAvatarUpdate}
                  />
                  <CardTitle className="mt-4">
                    {user?.name ?? DEFAULTS.name}
                  </CardTitle>
                  <CardDescription>Utilisateur {user?.isPremium ? 'Abonné' : 'Gratuit'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />
                  <div className="space-y-4 mt-2">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">
                        {user?.email ?? DEFAULTS.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">
                        {user?.phone ?? DEFAULTS.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">
                        {user?.address ?? DEFAULTS.address}
                      </span>
                    </div>
                    {/* Site Web */}
                    {user?.website && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{user.website}</span>
                          <button
                            onClick={() => window.open(user.website, '_blank')}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Visiter le site web"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">
                        Inscrit depuis{" "}
                        {new Date(
                          user?.created_at ?? DEFAULTS.created_at
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Separator />
                  
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      navigate("/features")
                    }
                  >
                    Voir mes fonctionnalités activé
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Colonne de droite – Formulaire */}
            <div className="col-span-1 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>
                    Modifiez vos informations personnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={onSubmit} className="space-y-6">
                      {/* Nom */}
                      <FormField
                        control={control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom complet</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Email */}
                      <FormField
                        control={control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Votre adresse email ne sera jamais partagée.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Téléphone */}
                        <FormField
                          control={control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {/* Adresse */}
                        <FormField
                          control={control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Adresse</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Bio */}
                      <FormField
                        control={control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Brève description qui apparaît sur votre profil.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Langue */}
                      <FormField
                        control={control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Langue</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionnez une langue" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem key="french" value="french">Français</SelectItem>
                                  <SelectItem key="english" value="english">English</SelectItem>
                                  <SelectItem key="spanish" value="spanish">Español</SelectItem>
                                  <SelectItem key="german" value="german">Deutsch</SelectItem>
                                  <SelectItem key="chinese" value="chinese">中文</SelectItem>
                                  <SelectItem key="arabic" value="arabic">العربية</SelectItem>
                                  <SelectItem key="portuguese" value="portuguese">Português</SelectItem>
                                  <SelectItem key="russian" value="russian">Русский</SelectItem>
                                  <SelectItem key="japanese" value="japanese">日本語</SelectItem>
                                  <SelectItem key="hindi" value="hindi">हिन्दी</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              La langue par défaut pour les notifications et les messages, surtout pour les générations par IA.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting
                          ? "Enregistrement..."
                          : "Enregistrer les modifications"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Sécurité */}
              <div className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sécurité</CardTitle>
                    <CardDescription>
                      Gérez vos paramètres de sécurité
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Changer le mot de passe</h4>
                          <p className="text-sm text-muted-foreground">
                            Mettez à jour votre mot de passe régulièrement
                          </p>
                        </div>
                      </div>
                      <Button variant="outline"
                        onClick={handleChangePassword} className="cursor-pointer px-4">Modifier</Button>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">
                            Vérification à deux facteurs
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Ajoutez une couche de sécurité supplémentaire
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">Configurer</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DeleteAccountCard />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default ProfilePage;