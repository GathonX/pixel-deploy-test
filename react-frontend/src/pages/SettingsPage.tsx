
import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Globe, 
  Bookmark
} from "lucide-react";
import { useNavigate } from 'react-router-dom';  // ← on importe useNavigate

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom doit contenir au moins 2 caractères",
  }),
  email: z.string().email({
    message: "Veuillez entrer une adresse email valide",
  }),
  bio: z.string().max(160).optional(),
  notifications: z.boolean().default(true),
  marketing: z.boolean().default(false),
});

const SettingsPage = () => {
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "Standard User",
      email: "user@example.com",
      bio: "",
      notifications: true,
      marketing: false,
    },
  });

  const navigate = useNavigate();   
  function onSubmit(values: z.infer<typeof profileFormSchema>) {
    toast.success("Paramètres mis à jour avec succès!");
    console.log(values);
  }

  const handleChangePassword = () => {
    navigate('/profile/change-password');
  };

  return (
    <SidebarProvider>
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Paramètres</h1>
            <p className="text-muted-foreground">
              Gérez vos préférences et paramètres du compte
            </p>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-8 w-full max-w-md">
              <TabsTrigger value="general" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                Général
              </TabsTrigger>
              
              <TabsTrigger value="notifications" className="flex-1">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres généraux</CardTitle>
                  <CardDescription>
                    Configurez les paramètres généraux de votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                     
                      
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Préférences</h3>
                        
                        <FormField
                          control={form.control}
                          name="notifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Notifications
                                </FormLabel>
                                <FormDescription>
                                  Recevoir des notifications par email
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="marketing"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Marketing
                                </FormLabel>
                                <FormDescription>
                                  Recevoir des emails concernant nos nouveautés et offres
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit">Enregistrer</Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sécurité</CardTitle>
                  <CardDescription>
                    Gérez les paramètres de sécurité de votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <h4 className="font-medium">Modifier le mot de passe</h4>
                      <p className="text-sm text-muted-foreground">
                        Changer votre mot de passe actuel
                      </p>
                    </div>
                    <Button  variant="outline"
  onClick={handleChangePassword} className="cursor-pointer px-4">Modifier</Button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <h4 className="font-medium">Authentification à deux facteurs</h4>
                      <p className="text-sm text-muted-foreground">
                        Ajouter une couche de sécurité supplémentaire
                      </p>
                    </div>
                    <Button variant="outline">Configurer</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profil</CardTitle>
                  <CardDescription>
                    Personnalisez votre profil public
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-500" />
                      </div>
                      <div className="space-y-1">
                        <Button size="sm">Changer l'avatar</Button>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG ou GIF. 1MB maximum.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Parlez-nous de vous" 
                            value={form.getValues("bio")} 
                            onChange={(e) => form.setValue("bio", e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>
                          Une courte description de vous-même.
                        </FormDescription>
                      </FormItem>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => toast.success("Profil mis à jour!")}>
                    Sauvegarder
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de notification</CardTitle>
                  <CardDescription>
                    Configurez comment et quand vous souhaitez être notifié
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-medium">Email</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="email-notifications" />
                      <label htmlFor="email-notifications">
                        Notifications par email
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="email-newsletters" />
                      <label htmlFor="email-newsletters">
                        Newsletters et mises à jour
                      </label>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="font-medium">Applications</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="app-notifications" defaultChecked />
                      <label htmlFor="app-notifications">
                        Notifications dans l'application
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch id="app-sounds" />
                      <label htmlFor="app-sounds">
                        Sons de notification
                      </label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => toast.success("Paramètres de notification mis à jour!")}>
                    Enregistrer
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default SettingsPage;
